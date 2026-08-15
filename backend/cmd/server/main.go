package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"time"

	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"backend/internal/repository"
	"backend/internal/storage"
)

func main() {
	log.Println("Starting Smiling Books Digital Library Backend Server...")

	// 1. Parse command line flags
	migrateFlag := flag.Bool("migrate", false, "Run database schema migrations and exit")
	seedFlag := flag.Bool("seed", false, "Seed the database with default records and exit")
	flag.Parse()

	// 2. Load config
	cfg := config.LoadConfig()

	// 3. Connect to database (Neon DB)
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is not configured. Exit.")
	}
	db, err := database.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to Neon DB: %v", err)
	}
	defer db.Close()

	// Instantiate repo
	repo := repository.NewPostgresBookRepository(db.Pool)

	// If flags are set, run them and exit
	if *migrateFlag || *seedFlag {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if *migrateFlag {
			if err := database.RunMigrations(ctx, db); err != nil {
				log.Fatalf("Migration failed: %v", err)
			}
		}
		if *seedFlag {
			if err := database.SeedData(ctx, repo); err != nil {
				log.Fatalf("Seeding failed: %v", err)
			}
		}
		log.Println("Database initialization commands completed successfully.")
		return
	}

	// Default behavior: Auto-run migrations and seeding on start to keep DB up-to-date
	{
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		log.Println("Auto-checking database migrations...")
		if err := database.RunMigrations(ctx, db); err != nil {
			log.Printf("WARNING: Auto-migration failed: %v", err)
		} else {
			if err := database.SeedData(ctx, repo); err != nil {
				log.Printf("WARNING: Auto-seeding failed: %v", err)
			}
		}
	}

	// 4. Initialize Storage
	var store storage.StorageService
	if cfg.UseLocalStorage {
		log.Println("Configured storage mode: LOCAL FILE SYSTEM")
		// Calculate full storage path
		wd, _ := os.Getwd()
		log.Printf("Working directory: %s", wd)
		backendURL := "http://localhost:" + cfg.Port
		store, err = storage.NewLocalStorage(cfg.LocalStorageDir, backendURL)
	} else {
		log.Println("Configured storage mode: CLOUDFLARE R2")
		if cfg.R2AccountID == "" || cfg.R2AccessKeyID == "" || cfg.R2SecretAccessKey == "" || cfg.R2BucketName == "" || cfg.R2Endpoint == "" {
			log.Fatal("Cloudflare R2 storage credentials are not fully configured. Exit.")
		}
		store, err = storage.NewR2Storage(
			cfg.R2AccountID,
			cfg.R2AccessKeyID,
			cfg.R2SecretAccessKey,
			cfg.R2BucketName,
			cfg.R2Endpoint,
		)
	}
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}

	// 5. Instantiate handlers
	h := handlers.NewHandler(repo, store, cfg.JWTSecret, cfg.LocalStorageDir)

	// 6. Initialize Router
	mux := http.NewServeMux()
	handlers.RegisterRoutes(mux, h, cfg.JWTSecret)

	// 7. Apply middlewares
	corsHandler := middleware.CORS(cfg.FrontendURL)(mux)
	loggedHandler := middleware.Logger(corsHandler)

	// 8. Start HTTP Server
	log.Printf("Server listening on port %s", cfg.Port)
	log.Printf("Allowed frontend origin: %s", cfg.FrontendURL)
	if err := http.ListenAndServe(":"+cfg.Port, loggedHandler); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}
