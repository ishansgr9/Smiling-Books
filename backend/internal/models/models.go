package models

import (
	"time"
)

type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Author struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Language struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Book struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	AuthorID        int        `json:"author_id"`
	AuthorName      string     `json:"author_name"`
	Description     string     `json:"description"`
	LanguageID      int        `json:"language_id"`
	LanguageName    string     `json:"language_name"`
	CategoryID      int        `json:"category_id"`
	CategoryName    string     `json:"category_name"`
	AgeGroup        string     `json:"age_group"`
	PublicationYear *int       `json:"publication_year"`
	CoverObjectKey  *string    `json:"cover_object_key"`
	CoverURL        *string    `json:"cover_url"` // Pre-signed/Public URL for the frontend
	PDFObjectKey    *string    `json:"pdf_object_key"`
	RightsStatus    string     `json:"rights_status"` // PUBLIC_DOMAIN, LICENSED, PERMISSION_GRANTED, PENDING_REVIEW
	Published       bool       `json:"published"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ReadingEvent struct {
	ID        int       `json:"id"`
	BookID    string    `json:"book_id"`
	CreatedAt time.Time `json:"created_at"`
	IPHash    string    `json:"-"`
}

type Analytics struct {
	TotalBooks     int            `json:"total_books"`
	PublishedBooks int            `json:"published_books"`
	PendingReview  int            `json:"pending_review"`
	TotalReads     int            `json:"total_reads"`
	PopularBooks   []PopularBook  `json:"popular_books"`
	CategoryStats  []CategoryStat `json:"category_stats"`
}

type PopularBook struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	AuthorName string `json:"author_name"`
	ReadCount  int    `json:"read_count"`
}

type CategoryStat struct {
	CategoryName string `json:"category_name"`
	BookCount    int    `json:"book_count"`
}

// Request payloads
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type BookRequest struct {
	Title           string `json:"title"`
	AuthorName      string `json:"author_name"` // Create/Select author by name
	Description     string `json:"description"`
	LanguageName    string `json:"language_name"` // Create/Select language by name
	CategoryName    string `json:"category_name"` // Create/Select category by name
	AgeGroup        string `json:"age_group"`
	PublicationYear *int   `json:"publication_year"`
	RightsStatus    string `json:"rights_status"`
	Published       bool   `json:"published"`
}

type JSONResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
