package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/internal/auth"
	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/repository"
	"backend/internal/storage"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	repo       repository.BookRepository
	store      storage.StorageService
	jwtSecret  string
	storageDir string
}

func NewHandler(repo repository.BookRepository, store storage.StorageService, jwtSecret string, storageDir string) *Handler {
	return &Handler{
		repo:       repo,
		store:      store,
		jwtSecret:  jwtSecret,
		storageDir: storageDir,
	}
}

func RegisterRoutes(mux *http.ServeMux, h *Handler, jwtSecret string) {
	// Public routes
	mux.HandleFunc("GET /api/books", h.ListBooks)
	mux.HandleFunc("GET /api/books/{id}", h.GetBook)
	mux.HandleFunc("GET /api/books/{id}/read", h.ReadBook)
	mux.HandleFunc("GET /api/books/{id}/pdf", h.StreamPDF)
	mux.HandleFunc("GET /api/categories", h.ListCategories)
	mux.HandleFunc("GET /api/languages", h.ListLanguages)
	mux.HandleFunc("GET /api/authors", h.ListAuthors)

	// Auth routes
	mux.HandleFunc("POST /api/auth/login", h.Login)
	mux.HandleFunc("POST /api/auth/logout", h.Logout)

	// Local file server route (for local fallback storage)
	mux.HandleFunc("GET /api/files/{folder}/{filename}", h.ServeLocalFile)

	// Admin routes (protected)
	authMiddleware := middleware.AuthMiddleware(jwtSecret)

	mux.Handle("GET /api/admin/books", authMiddleware(http.HandlerFunc(h.ListAdminBooks)))
	mux.Handle("POST /api/admin/books", authMiddleware(http.HandlerFunc(h.CreateBook)))
	mux.Handle("GET /api/admin/books/{id}", authMiddleware(http.HandlerFunc(h.GetAdminBook)))
	mux.Handle("PUT /api/admin/books/{id}", authMiddleware(http.HandlerFunc(h.UpdateBook)))
	mux.Handle("DELETE /api/admin/books/{id}", authMiddleware(http.HandlerFunc(h.DeleteBook)))
	mux.Handle("POST /api/admin/books/{id}/publish", authMiddleware(http.HandlerFunc(h.PublishBook)))
	mux.Handle("POST /api/admin/books/{id}/unpublish", authMiddleware(http.HandlerFunc(h.UnpublishBook)))
	mux.Handle("POST /api/admin/books/{id}/upload-cover", authMiddleware(http.HandlerFunc(h.UploadCover)))
	mux.Handle("POST /api/admin/books/{id}/upload-pdf", authMiddleware(http.HandlerFunc(h.UploadPDF)))
	mux.Handle("GET /api/admin/analytics", authMiddleware(http.HandlerFunc(h.GetAnalytics)))
}

// Helpers
func respondJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(models.JSONResponse{
		Success: true,
		Data:    payload,
	})
}

func respondError(w http.ResponseWriter, statusCode int, errorCode, message string) {
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

func getIPHash(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
		// Strip port if exists
		if idx := strings.LastIndex(ip, ":"); idx != -1 {
			ip = ip[:idx]
		}
	}
	hash := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(hash[:])
}

// --- Public Handlers ---

func (h *Handler) ListBooks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	categoryID, _ := strconv.Atoi(r.URL.Query().Get("category"))
	languageID, _ := strconv.Atoi(r.URL.Query().Get("language"))
	ageGroup := r.URL.Query().Get("age_group")
	sortBy := r.URL.Query().Get("sort")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 12
	}
	offset := (page - 1) * limit

	books, total, err := h.repo.GetBooks(r.Context(), q, categoryID, languageID, ageGroup, sortBy, true, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Populate Cover URLs
	for i := range books {
		if books[i].CoverObjectKey != nil {
			url, err := h.store.GetSignedURL(r.Context(), *books[i].CoverObjectKey, 24*time.Hour)
			if err == nil {
				books[i].CoverURL = &url
			}
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"books": books,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *Handler) GetBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil || !book.Published {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found or unpublished")
		return
	}

	if book.CoverObjectKey != nil {
		url, _ := h.store.GetSignedURL(r.Context(), *book.CoverObjectKey, 24*time.Hour)
		book.CoverURL = &url
	}

	respondJSON(w, http.StatusOK, book)
}

func (h *Handler) ReadBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil || !book.Published {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found or unavailable")
		return
	}

	if book.PDFObjectKey == nil || *book.PDFObjectKey == "" {
		respondError(w, http.StatusNotFound, "PDF_NOT_UPLOADED", "PDF has not been uploaded for this book yet")
		return
	}

	// Track reading event anonymously
	ipHash := getIPHash(r)
	_ = h.repo.IncrementReadCount(r.Context(), id, ipHash)

	// Generate signed URL valid for 1 hour
	signedURL, err := h.store.GetSignedURL(r.Context(), *book.PDFObjectKey, 1*time.Hour)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"url": signedURL,
	})
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.repo.GetCategories(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, categories)
}

func (h *Handler) ListLanguages(w http.ResponseWriter, r *http.Request) {
	languages, err := h.repo.GetLanguages(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, languages)
}

func (h *Handler) ListAuthors(w http.ResponseWriter, r *http.Request) {
	authors, err := h.repo.GetAuthors(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, authors)
}

// --- Auth Handlers ---

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	if user == nil {
		respondError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		respondError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "JWT_ERROR", "Failed to generate session token")
		return
	}

	// Set secure session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   !strings.HasPrefix(r.Host, "localhost:") && !strings.HasPrefix(r.Host, "127.0.0.1:"),
		SameSite: http.SameSiteLaxMode,
	})

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   !strings.HasPrefix(r.Host, "localhost:") && !strings.HasPrefix(r.Host, "127.0.0.1:"),
		SameSite: http.SameSiteLaxMode,
	})
	respondJSON(w, http.StatusOK, "Logged out successfully")
}

// ServeLocalFile reads and streams local storage files for development setup
func (h *Handler) ServeLocalFile(w http.ResponseWriter, r *http.Request) {
	folder := r.PathValue("folder")
	filename := r.PathValue("filename")

	if folder != "covers" && folder != "books" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Basic safety sanitization on filename
	filename = filepath.Base(filename)
	path := filepath.Join(h.storageDir, folder, filename)

	http.ServeFile(w, r, path)
}

// --- Admin Handlers (Protected) ---

func (h *Handler) ListAdminBooks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	categoryID, _ := strconv.Atoi(r.URL.Query().Get("category"))
	languageID, _ := strconv.Atoi(r.URL.Query().Get("language"))
	ageGroup := r.URL.Query().Get("age_group")
	sortBy := r.URL.Query().Get("sort")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	books, total, err := h.repo.GetBooks(r.Context(), q, categoryID, languageID, ageGroup, sortBy, false, limit, offset)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	for i := range books {
		if books[i].CoverObjectKey != nil {
			url, _ := h.store.GetSignedURL(r.Context(), *books[i].CoverObjectKey, 24*time.Hour)
			books[i].CoverURL = &url
		}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"books": books,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *Handler) GetAdminBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found")
		return
	}

	if book.CoverObjectKey != nil {
		url, _ := h.store.GetSignedURL(r.Context(), *book.CoverObjectKey, 24*time.Hour)
		book.CoverURL = &url
	}

	respondJSON(w, http.StatusOK, book)
}

func (h *Handler) CreateBook(w http.ResponseWriter, r *http.Request) {
	var req models.BookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	// Validate rights status
	if req.RightsStatus == "PENDING_REVIEW" && req.Published {
		respondError(w, http.StatusBadRequest, "INVALID_BUSINESS_RULE", "Books with PENDING_REVIEW status cannot be published")
		return
	}

	book, err := h.repo.CreateBook(r.Context(), &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, book)
}

func (h *Handler) UpdateBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req models.BookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON payload")
		return
	}

	// Validate rights status
	if req.RightsStatus == "PENDING_REVIEW" && req.Published {
		respondError(w, http.StatusBadRequest, "INVALID_BUSINESS_RULE", "Books with PENDING_REVIEW status cannot be published")
		return
	}

	book, err := h.repo.UpdateBook(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, book)
}

func (h *Handler) DeleteBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Get keys first to delete from R2
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found")
		return
	}

	// Delete db record
	err = h.repo.DeleteBook(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	// Delete from storage (async is fine)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		if book.CoverObjectKey != nil {
			_ = h.store.DeleteFile(ctx, *book.CoverObjectKey)
		}
		if book.PDFObjectKey != nil {
			_ = h.store.DeleteFile(ctx, *book.PDFObjectKey)
		}
	}()

	respondJSON(w, http.StatusOK, "Book metadata and files deleted successfully")
}

func (h *Handler) PublishBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found")
		return
	}

	if book.RightsStatus == "PENDING_REVIEW" {
		respondError(w, http.StatusBadRequest, "INVALID_BUSINESS_RULE", "Books with PENDING_REVIEW rights status cannot be published")
		return
	}

	req := models.BookRequest{
		Title:           book.Title,
		AuthorName:      book.AuthorName,
		Description:     book.Description,
		LanguageName:    book.LanguageName,
		CategoryName:    book.CategoryName,
		AgeGroup:        book.AgeGroup,
		PublicationYear: book.PublicationYear,
		RightsStatus:    book.RightsStatus,
		Published:       true,
	}

	updated, err := h.repo.UpdateBook(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *Handler) UnpublishBook(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found")
		return
	}

	req := models.BookRequest{
		Title:           book.Title,
		AuthorName:      book.AuthorName,
		Description:     book.Description,
		LanguageName:    book.LanguageName,
		CategoryName:    book.CategoryName,
		AgeGroup:        book.AgeGroup,
		PublicationYear: book.PublicationYear,
		RightsStatus:    book.RightsStatus,
		Published:       false,
	}

	updated, err := h.repo.UpdateBook(r.Context(), id, &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *Handler) UploadCover(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Limit request size to 2MB for covers
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)

	err := r.ParseMultipartForm(2 << 20)
	if err != nil {
		respondError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "Cover image exceeds the maximum limit of 2MB")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_FILE", "Could not find file in request parameters")
		return
	}
	defer file.Close()

	// Validate content type & extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
		respondError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", "Supported cover image formats: PNG, JPG, JPEG, WebP")
		return
	}

	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		respondError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", "Invalid file MIME type")
		return
	}

	// Clean up key format: covers/{uuid}.webp
	key := "covers/" + id + ext

	err = h.store.UploadFile(r.Context(), key, file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error())
		return
	}

	err = h.repo.UpdateBookFiles(r.Context(), id, &key, nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"cover_key": key,
	})
}

func (h *Handler) UploadPDF(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Limit request size to 50MB for books
	r.Body = http.MaxBytesReader(w, r.Body, 50<<20)

	err := r.ParseMultipartForm(50 << 20)
	if err != nil {
		respondError(w, http.StatusBadRequest, "FILE_TOO_LARGE", "PDF file exceeds the maximum limit of 50MB")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_FILE", "Could not find file in request parameters")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" {
		respondError(w, http.StatusBadRequest, "INVALID_FILE_TYPE", "Supported book format is strictly PDF (.pdf)")
		return
	}

	key := "books/" + id + ".pdf"

	err = h.store.UploadFile(r.Context(), key, file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error())
		return
	}

	err = h.repo.UpdateBookFiles(r.Context(), id, nil, &key)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"pdf_key": key,
	})
}

func (h *Handler) GetAnalytics(w http.ResponseWriter, r *http.Request) {
	analytics, err := h.repo.GetAnalytics(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, analytics)
}

func (h *Handler) StreamPDF(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	book, err := h.repo.GetBookByID(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if book == nil || !book.Published {
		respondError(w, http.StatusNotFound, "BOOK_NOT_FOUND", "Book not found or unavailable")
		return
	}

	if book.PDFObjectKey == nil || *book.PDFObjectKey == "" {
		respondError(w, http.StatusNotFound, "PDF_NOT_UPLOADED", "PDF has not been uploaded for this book yet")
		return
	}

	// 1. If using local storage, serve file directly from disk
	if h.storageDir != "" {
		path := filepath.Join(h.storageDir, *book.PDFObjectKey)
		if _, err := os.Stat(path); err == nil {
			w.Header().Set("Content-Type", "application/pdf")
			w.Header().Set("Content-Disposition", "inline")
			http.ServeFile(w, r, path)
			return
		}
	}

	// 2. If using Cloudflare R2, generate a signed URL and proxy the file streaming
	signedURL, err := h.store.GetSignedURL(r.Context(), *book.PDFObjectKey, 5*time.Minute)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "STORAGE_ERROR", err.Error())
		return
	}

	resp, err := http.Get(signedURL)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "STREAM_ERROR", err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respondError(w, http.StatusInternalServerError, "STREAM_ERROR", "Failed to retrieve PDF from storage server")
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "inline")
	w.Header().Set("Cache-Control", "private, max-age=3600")

	_, _ = io.Copy(w, resp.Body)
}
