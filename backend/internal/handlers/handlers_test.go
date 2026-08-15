package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"backend/internal/auth"
	"backend/internal/models"
)

// Mock repository for testing business logic
type mockBookRepository struct{}

func (m *mockBookRepository) GetBooks(ctx context.Context, q string, categoryID, languageID int, ageGroup, sortBy string, publishedOnly bool, limit, offset int) ([]models.Book, int, error) {
	return nil, 0, nil
}
func (m *mockBookRepository) GetBookByID(ctx context.Context, id string) (*models.Book, error) {
	return nil, nil
}
func (m *mockBookRepository) CreateBook(ctx context.Context, req *models.BookRequest) (*models.Book, error) {
	return &models.Book{
		Title:        req.Title,
		RightsStatus: req.RightsStatus,
		Published:    req.Published,
	}, nil
}
func (m *mockBookRepository) UpdateBook(ctx context.Context, id string, req *models.BookRequest) (*models.Book, error) {
	return nil, nil
}
func (m *mockBookRepository) DeleteBook(ctx context.Context, id string) error {
	return nil
}
func (m *mockBookRepository) UpdateBookFiles(ctx context.Context, id string, coverKey, pdfKey *string) error {
	return nil
}
func (m *mockBookRepository) IncrementReadCount(ctx context.Context, id string, ipHash string) error {
	return nil
}
func (m *mockBookRepository) GetCategories(ctx context.Context) ([]models.Category, error) {
	return nil, nil
}
func (m *mockBookRepository) GetLanguages(ctx context.Context) ([]models.Language, error) {
	return nil, nil
}
func (m *mockBookRepository) GetAuthors(ctx context.Context) ([]models.Author, error) {
	return nil, nil
}
func (m *mockBookRepository) GetAnalytics(ctx context.Context) (*models.Analytics, error) {
	return nil, nil
}
func (m *mockBookRepository) CreateUser(ctx context.Context, name, email, passwordHash, role string) (*models.User, error) {
	return nil, nil
}
func (m *mockBookRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, nil
}

func TestJWTTokenLifecycle(t *testing.T) {
	secret := "test_jwt_secret_smiling_books_2026"
	userID := "user-123"
	email := "test@admin.org"
	role := "ADMIN"

	// 1. Generate token
	token, err := auth.GenerateToken(userID, email, role, secret)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}
	if len(token) == 0 {
		t.Fatal("Token is empty")
	}

	// 2. Verify token
	claims, err := auth.VerifyToken(token, secret)
	if err != nil {
		t.Fatalf("Failed to verify token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %s, got %s", userID, claims.UserID)
	}
	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}
	if claims.Role != role {
		t.Errorf("Expected Role %s, got %s", role, claims.Role)
	}

	// 3. Verify failure on incorrect secret
	_, err = auth.VerifyToken(token, "wrong_secret")
	if err == nil {
		t.Fatal("Expected token verification to fail with wrong secret, but it succeeded")
	}
}

func TestRightsEnforcementPublishing(t *testing.T) {
	h := &Handler{
		repo:      &mockBookRepository{},
		jwtSecret: "test_secret",
	}

	// Case 1: Try to create a book with PENDING_REVIEW and Published = true
	reqBody := `{"title":"Unlicensed Book","author_name":"Unknown","description":"Draft","language_name":"English","category_name":"Fiction","age_group":"9-12","publication_year":2026,"rights_status":"PENDING_REVIEW","published":true}`
	req := httptest.NewRequest(http.MethodPost, "/api/admin/books", strings.NewReader(reqBody))
	rec := httptest.NewRecorder()

	h.CreateBook(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("Expected HTTP 400 Bad Request, got %d", rec.Code)
	}

	if !strings.Contains(rec.Body.String(), "Books with PENDING_REVIEW status cannot be published") {
		t.Errorf("Expected error message about PENDING_REVIEW publishing, got: %s", rec.Body.String())
	}

	// Case 2: Try to create a book with PUBLIC_DOMAIN and Published = true (Should succeed)
	reqBody2 := `{"title":"Public Domain Book","author_name":"Unknown","description":"Draft","language_name":"English","category_name":"Fiction","age_group":"9-12","publication_year":2026,"rights_status":"PUBLIC_DOMAIN","published":true}`
	req2 := httptest.NewRequest(http.MethodPost, "/api/admin/books", strings.NewReader(reqBody2))
	rec2 := httptest.NewRecorder()

	h.CreateBook(rec2, req2)

	if rec2.Code != http.StatusCreated {
		t.Errorf("Expected HTTP 201 Created, got %d. Body: %s", rec2.Code, rec2.Body.String())
	}
}

func TestIPAddressHashing(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/books/some-id/read", nil)
	req.RemoteAddr = "192.168.1.1:12345"

	hash1 := getIPHash(req)
	if len(hash1) != 64 {
		t.Errorf("Expected 64-character SHA256 hex string, got %d characters: %s", len(hash1), hash1)
	}

	// Verify that port stripping works and same IP returns same hash
	req2 := httptest.NewRequest(http.MethodGet, "/api/books/some-id/read", nil)
	req2.RemoteAddr = "192.168.1.1:54321"

	hash2 := getIPHash(req2)
	if hash1 != hash2 {
		t.Error("Expected same IP address with different ports to produce the same hash, but hashes differed")
	}

	// Verify different IP produces different hash
	req3 := httptest.NewRequest(http.MethodGet, "/api/books/some-id/read", nil)
	req3.RemoteAddr = "10.0.0.1:12345"

	hash3 := getIPHash(req3)
	if hash1 == hash3 {
		t.Error("Expected different IP addresses to produce different hashes, but they were identical")
	}
}
