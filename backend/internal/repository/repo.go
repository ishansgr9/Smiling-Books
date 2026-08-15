package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BookRepository interface {
	GetBooks(ctx context.Context, q string, categoryID, languageID int, ageGroup, sortBy string, publishedOnly bool, limit, offset int) ([]models.Book, int, error)
	GetBookByID(ctx context.Context, id string) (*models.Book, error)
	CreateBook(ctx context.Context, req *models.BookRequest) (*models.Book, error)
	UpdateBook(ctx context.Context, id string, req *models.BookRequest) (*models.Book, error)
	DeleteBook(ctx context.Context, id string) error
	UpdateBookFiles(ctx context.Context, id string, coverKey, pdfKey *string) error
	IncrementReadCount(ctx context.Context, id string, ipHash string) error

	GetCategories(ctx context.Context) ([]models.Category, error)
	GetLanguages(ctx context.Context) ([]models.Language, error)
	GetAuthors(ctx context.Context) ([]models.Author, error)
	GetAnalytics(ctx context.Context) (*models.Analytics, error)

	CreateUser(ctx context.Context, name, email, passwordHash, role string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
}

type PostgresBookRepository struct {
	db *pgxpool.Pool
}

func NewPostgresBookRepository(db *pgxpool.Pool) *PostgresBookRepository {
	return &PostgresBookRepository{db: db}
}

// Helper to get or create Author
func (r *PostgresBookRepository) getOrCreateAuthor(ctx context.Context, tx pgx.Tx, name string) (int, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, errors.New("author name cannot be empty")
	}

	var id int
	err := tx.QueryRow(ctx, "SELECT id FROM authors WHERE name = $1", name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	err = tx.QueryRow(ctx, "INSERT INTO authors (name) VALUES ($1) RETURNING id", name).Scan(&id)
	return id, err
}

// Helper to get or create Category
func (r *PostgresBookRepository) getOrCreateCategory(ctx context.Context, tx pgx.Tx, name string) (int, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, errors.New("category name cannot be empty")
	}

	var id int
	err := tx.QueryRow(ctx, "SELECT id FROM categories WHERE name = $1", name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	err = tx.QueryRow(ctx, "INSERT INTO categories (name) VALUES ($1) RETURNING id", name).Scan(&id)
	return id, err
}

// Helper to get or create Language
func (r *PostgresBookRepository) getOrCreateLanguage(ctx context.Context, tx pgx.Tx, name string) (int, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, errors.New("language name cannot be empty")
	}

	var id int
	err := tx.QueryRow(ctx, "SELECT id FROM languages WHERE name = $1", name).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}

	err = tx.QueryRow(ctx, "INSERT INTO languages (name) VALUES ($1) RETURNING id", name).Scan(&id)
	return id, err
}

func (r *PostgresBookRepository) GetBooks(ctx context.Context, q string, categoryID, languageID int, ageGroup, sortBy string, publishedOnly bool, limit, offset int) ([]models.Book, int, error) {
	var conds []string
	var args []interface{}
	argCount := 1

	if publishedOnly {
		conds = append(conds, fmt.Sprintf("b.published = $%d", argCount))
		args = append(args, true)
		argCount++
	}

	if categoryID > 0 {
		conds = append(conds, fmt.Sprintf("b.category_id = $%d", argCount))
		args = append(args, categoryID)
		argCount++
	}

	if languageID > 0 {
		conds = append(conds, fmt.Sprintf("b.language_id = $%d", argCount))
		args = append(args, languageID)
		argCount++
	}

	if ageGroup != "" && ageGroup != "All" {
		conds = append(conds, fmt.Sprintf("b.age_group = $%d", argCount))
		args = append(args, ageGroup)
		argCount++
	}

	if q != "" {
		// Search title, description, category, and author using ILIKE
		conds = append(conds, fmt.Sprintf("(b.title ILIKE $%d OR b.description ILIKE $%d OR a.name ILIKE $%d OR c.name ILIKE $%d)", argCount, argCount, argCount, argCount))
		args = append(args, "%"+q+"%")
		argCount++
	}

	whereClause := ""
	if len(conds) > 0 {
		whereClause = "WHERE " + strings.Join(conds, " AND ")
	}

	// First query total count
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM books b
		JOIN authors a ON b.author_id = a.id
		JOIN categories c ON b.category_id = c.id
		JOIN languages l ON b.language_id = l.id
		%s`, whereClause)

	var totalCount int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// Sort orders
	orderBy := "b.title ASC"
	if sortBy == "newest" {
		orderBy = "b.created_at DESC"
	}

	query := fmt.Sprintf(`
		SELECT b.id, b.title, b.description, b.age_group, b.publication_year, 
		       b.cover_object_key, b.pdf_object_key, b.rights_status, b.published,
		       b.created_at, b.updated_at,
		       a.id, a.name, c.id, c.name, l.id, l.name
		FROM books b
		JOIN authors a ON b.author_id = a.id
		JOIN categories c ON b.category_id = c.id
		JOIN languages l ON b.language_id = l.id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, whereClause, orderBy, argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		err = rows.Scan(
			&b.ID, &b.Title, &b.Description, &b.AgeGroup, &b.PublicationYear,
			&b.CoverObjectKey, &b.PDFObjectKey, &b.RightsStatus, &b.Published,
			&b.CreatedAt, &b.UpdatedAt,
			&b.AuthorID, &b.AuthorName,
			&b.CategoryID, &b.CategoryName,
			&b.LanguageID, &b.LanguageName,
		)
		if err != nil {
			return nil, 0, err
		}
		books = append(books, b)
	}

	return books, totalCount, nil
}

func (r *PostgresBookRepository) GetBookByID(ctx context.Context, id string) (*models.Book, error) {
	query := `
		SELECT b.id, b.title, b.description, b.age_group, b.publication_year, 
		       b.cover_object_key, b.pdf_object_key, b.rights_status, b.published,
		       b.created_at, b.updated_at,
		       a.id, a.name, c.id, c.name, l.id, l.name
		FROM books b
		JOIN authors a ON b.author_id = a.id
		JOIN categories c ON b.category_id = c.id
		JOIN languages l ON b.language_id = l.id
		WHERE b.id = $1`

	var b models.Book
	err := r.db.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.Title, &b.Description, &b.AgeGroup, &b.PublicationYear,
		&b.CoverObjectKey, &b.PDFObjectKey, &b.RightsStatus, &b.Published,
		&b.CreatedAt, &b.UpdatedAt,
		&b.AuthorID, &b.AuthorName,
		&b.CategoryID, &b.CategoryName,
		&b.LanguageID, &b.LanguageName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &b, nil
}

func (r *PostgresBookRepository) CreateBook(ctx context.Context, req *models.BookRequest) (*models.Book, error) {
	// Begin transaction to ensure relational consistency
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fetch or create relations
	authorID, err := r.getOrCreateAuthor(ctx, tx, req.AuthorName)
	if err != nil {
		return nil, err
	}

	categoryID, err := r.getOrCreateCategory(ctx, tx, req.CategoryName)
	if err != nil {
		return nil, err
	}

	languageID, err := r.getOrCreateLanguage(ctx, tx, req.LanguageName)
	if err != nil {
		return nil, err
	}

	// Enforce business rules
	published := req.Published
	if req.RightsStatus == "PENDING_REVIEW" {
		published = false
	}

	var bookID string
	query := `
		INSERT INTO books (
			title, author_id, description, language_id, category_id, 
			age_group, publication_year, rights_status, published
		) 
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
		RETURNING id`

	err = tx.QueryRow(ctx, query,
		req.Title, authorID, req.Description, languageID, categoryID,
		req.AgeGroup, req.PublicationYear, req.RightsStatus, published,
	).Scan(&bookID)
	if err != nil {
		return nil, fmt.Errorf("failed to insert book: %v", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return r.GetBookByID(ctx, bookID)
}

func (r *PostgresBookRepository) UpdateBook(ctx context.Context, id string, req *models.BookRequest) (*models.Book, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	authorID, err := r.getOrCreateAuthor(ctx, tx, req.AuthorName)
	if err != nil {
		return nil, err
	}

	categoryID, err := r.getOrCreateCategory(ctx, tx, req.CategoryName)
	if err != nil {
		return nil, err
	}

	languageID, err := r.getOrCreateLanguage(ctx, tx, req.LanguageName)
	if err != nil {
		return nil, err
	}

	published := req.Published
	if req.RightsStatus == "PENDING_REVIEW" {
		published = false
	}

	query := `
		UPDATE books 
		SET title = $1, author_id = $2, description = $3, language_id = $4, 
		    category_id = $5, age_group = $6, publication_year = $7, 
		    rights_status = $8, published = $9, updated_at = NOW() 
		WHERE id = $10`

	tag, err := tx.Exec(ctx, query,
		req.Title, authorID, req.Description, languageID,
		categoryID, req.AgeGroup, req.PublicationYear,
		req.RightsStatus, published, id,
	)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, errors.New("book not found")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return r.GetBookByID(ctx, id)
}

func (r *PostgresBookRepository) DeleteBook(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, "DELETE FROM books WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("book not found")
	}
	return nil
}

func (r *PostgresBookRepository) UpdateBookFiles(ctx context.Context, id string, coverKey, pdfKey *string) error {
	var query string
	var arg interface{}

	if coverKey != nil && pdfKey != nil {
		query = "UPDATE books SET cover_object_key = $1, pdf_object_key = $2, updated_at = NOW() WHERE id = $3"
		_, err := r.db.Exec(ctx, query, *coverKey, *pdfKey, id)
		return err
	} else if coverKey != nil {
		query = "UPDATE books SET cover_object_key = $1, updated_at = NOW() WHERE id = $2"
		arg = *coverKey
	} else if pdfKey != nil {
		query = "UPDATE books SET pdf_object_key = $1, updated_at = NOW() WHERE id = $2"
		arg = *pdfKey
	} else {
		return nil
	}

	tag, err := r.db.Exec(ctx, query, arg, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("book not found")
	}
	return nil
}

func (r *PostgresBookRepository) IncrementReadCount(ctx context.Context, id string, ipHash string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert reading event
	_, err = tx.Exec(ctx, "INSERT INTO reading_events (book_id, ip_hash) VALUES ($1, $2)", id, ipHash)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *PostgresBookRepository) GetCategories(ctx context.Context) ([]models.Category, error) {
	rows, err := r.db.Query(ctx, "SELECT id, name FROM categories ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func (r *PostgresBookRepository) GetLanguages(ctx context.Context) ([]models.Language, error) {
	rows, err := r.db.Query(ctx, "SELECT id, name FROM languages ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var languages []models.Language
	for rows.Next() {
		var l models.Language
		if err := rows.Scan(&l.ID, &l.Name); err != nil {
			return nil, err
		}
		languages = append(languages, l)
	}
	return languages, nil
}

func (r *PostgresBookRepository) GetAuthors(ctx context.Context) ([]models.Author, error) {
	rows, err := r.db.Query(ctx, "SELECT id, name FROM authors ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var authors []models.Author
	for rows.Next() {
		var a models.Author
		if err := rows.Scan(&a.ID, &a.Name); err != nil {
			return nil, err
		}
		authors = append(authors, a)
	}
	return authors, nil
}

func (r *PostgresBookRepository) GetAnalytics(ctx context.Context) (*models.Analytics, error) {
	var a models.Analytics

	// 1. Total books
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM books").Scan(&a.TotalBooks)
	if err != nil {
		return nil, err
	}

	// 2. Published books
	err = r.db.QueryRow(ctx, "SELECT COUNT(*) FROM books WHERE published = TRUE").Scan(&a.PublishedBooks)
	if err != nil {
		return nil, err
	}

	// 3. Pending review books
	err = r.db.QueryRow(ctx, "SELECT COUNT(*) FROM books WHERE rights_status = 'PENDING_REVIEW'").Scan(&a.PendingReview)
	if err != nil {
		return nil, err
	}

	// 4. Total reads
	err = r.db.QueryRow(ctx, "SELECT COUNT(*) FROM reading_events").Scan(&a.TotalReads)
	if err != nil {
		return nil, err
	}

	// 5. Popular books (limit to top 5)
	rows, err := r.db.Query(ctx, `
		SELECT b.id, b.title, auth.name, COUNT(re.id) as read_count
		FROM books b
		LEFT JOIN reading_events re ON b.id = re.book_id
		JOIN authors auth ON b.author_id = auth.id
		GROUP BY b.id, b.title, auth.name
		ORDER BY read_count DESC, b.title ASC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var pb models.PopularBook
		if err := rows.Scan(&pb.ID, &pb.Title, &pb.AuthorName, &pb.ReadCount); err != nil {
			return nil, err
		}
		a.PopularBooks = append(a.PopularBooks, pb)
	}

	// 6. Category stats
	catRows, err := r.db.Query(ctx, `
		SELECT c.name, COUNT(b.id) as book_count
		FROM categories c
		LEFT JOIN books b ON c.id = b.category_id
		GROUP BY c.id, c.name
		ORDER BY book_count DESC, c.name ASC`)
	if err != nil {
		return nil, err
	}
	defer catRows.Close()

	for catRows.Next() {
		var cs models.CategoryStat
		if err := catRows.Scan(&cs.CategoryName, &cs.BookCount); err != nil {
			return nil, err
		}
		a.CategoryStats = append(a.CategoryStats, cs)
	}

	return &a, nil
}

func (r *PostgresBookRepository) CreateUser(ctx context.Context, name, email, passwordHash, role string) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var u models.User
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, name, email, role, created_at`,
		name, email, passwordHash, role,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.CreatedAt)

	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresBookRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	var u models.User
	err := r.db.QueryRow(ctx, `
		SELECT id, name, email, password_hash, role, created_at 
		FROM users 
		WHERE email = $1`, email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}
