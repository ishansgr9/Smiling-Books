-- 001_init.sql
-- Smiling Books Digital Library Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (Administrators)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Authors
CREATE TABLE IF NOT EXISTS authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Languages
CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Books
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author_id INT NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    description TEXT,
    language_id INT NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    age_group VARCHAR(50) NOT NULL,
    publication_year INT,
    cover_object_key VARCHAR(500),
    pdf_object_key VARCHAR(500),
    rights_status VARCHAR(50) NOT NULL DEFAULT 'PENDING_REVIEW',
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Business Rules: PENDING_REVIEW books CANNOT be published
    CONSTRAINT chk_rights_published CHECK (
        NOT (rights_status = 'PENDING_REVIEW' AND published = TRUE)
    ),
    -- Allowed Rights Status check
    CONSTRAINT chk_rights_status CHECK (
        rights_status IN ('PUBLIC_DOMAIN', 'LICENSED', 'PERMISSION_GRANTED', 'PENDING_REVIEW')
    )
);

-- Reading Events (Anonymous Analytics)
CREATE TABLE IF NOT EXISTS reading_events (
    id SERIAL PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_hash VARCHAR(64) NOT NULL
);

-- Create Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_books_title ON books (title);
CREATE INDEX IF NOT EXISTS idx_books_author_id ON books (author_id);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books (category_id);
CREATE INDEX IF NOT EXISTS idx_books_language_id ON books (language_id);
CREATE INDEX IF NOT EXISTS idx_books_published ON books (published);
CREATE INDEX IF NOT EXISTS idx_books_rights_status ON books (rights_status);
