package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	FrontendURL       string
	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2Endpoint        string
	UseLocalStorage   bool
	LocalStorageDir   string
}

func LoadConfig() *Config {
	// Load .env if present (ignore error if not present, e.g. in production)
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Println("WARNING: DATABASE_URL is not set")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("WARNING: JWT_SECRET is not set, using default development key")
		jwtSecret = "development_secret_key_smiling_books_digital_library"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	useLocal := true
	useLocalStr := os.Getenv("USE_LOCAL_STORAGE")
	if useLocalStr != "" {
		if val, err := strconv.ParseBool(useLocalStr); err == nil {
			useLocal = val
		}
	}

	localStorageDir := os.Getenv("LOCAL_STORAGE_DIR")
	if localStorageDir == "" {
		localStorageDir = "./storage"
	}

	return &Config{
		Port:              port,
		DatabaseURL:       strings.TrimSpace(dbURL),
		JWTSecret:         strings.TrimSpace(jwtSecret),
		FrontendURL:       strings.TrimSpace(frontendURL),
		R2AccountID:       strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID")),
		R2AccessKeyID:     strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID")),
		R2SecretAccessKey: strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY")),
		R2BucketName:      strings.TrimSpace(os.Getenv("R2_BUCKET_NAME")),
		R2Endpoint:        strings.TrimSpace(os.Getenv("R2_ENDPOINT")),
		UseLocalStorage:   useLocal,
		LocalStorageDir:   localStorageDir,
	}
}
