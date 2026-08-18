package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/internal/auth"
	"backend/internal/models"
)

type contextKey string

const (
	UserContextKey contextKey = "user"
)

type CustomResponseWriter struct {
	http.ResponseWriter
	StatusCode int
}

func (w *CustomResponseWriter) WriteHeader(code int) {
	w.StatusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &CustomResponseWriter{ResponseWriter: w, StatusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rw.StatusCode, time.Since(start))
	})
}

func CORS(frontendURL string) func(http.Handler) http.Handler {
	var allowedOrigins []string
	if frontendURL != "" {
		for _, url := range strings.Split(frontendURL, ",") {
			allowedOrigins = append(allowedOrigins, strings.TrimSpace(url))
		}
	}
	// Always allow localhost for development
	allowedOrigins = append(allowedOrigins, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			isAllowed := false

			if origin != "" {
				// 1. Check exact matches
				for _, allowed := range allowedOrigins {
					if origin == allowed {
						isAllowed = true
						break
					}
				}

				// 2. Check suffix/wildcard matches for Vercel preview domains, Render domain, and local hosts
				if !isAllowed {
					if strings.HasSuffix(origin, ".vercel.app") ||
						strings.HasSuffix(origin, ".onrender.com") ||
						strings.HasPrefix(origin, "http://localhost:") ||
						strings.HasPrefix(origin, "http://127.0.0.1:") {
						isAllowed = true
					}
				}

				if isAllowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
				}
			}

			if !isAllowed && len(allowedOrigins) > 0 {
				w.Header().Set("Access-Control-Allow-Origin", allowedOrigins[0])
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenString := ""

			// 1. Check Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}

			// 2. Check Cookie fallback
			if tokenString == "" {
				cookie, err := r.Cookie("token")
				if err == nil {
					tokenString = cookie.Value
				}
			}

			if tokenString == "" {
				respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization token")
				return
			}

			claims, err := auth.VerifyToken(tokenString, jwtSecret)
			if err != nil {
				respondWithError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired authorization token")
				return
			}

			// Store user claims in context
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserFromContext(ctx context.Context) (*auth.Claims, bool) {
	claims, ok := ctx.Value(UserContextKey).(*auth.Claims)
	return claims, ok
}

func respondWithError(w http.ResponseWriter, statusCode int, errorCode, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(models.JSONResponse{
		Success: false,
		Error: &models.APIError{
			Code:    errorCode,
			Message: message,
		},
	})
}
