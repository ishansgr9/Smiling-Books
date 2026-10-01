# REST API Reference Documentation
## Smiling Books Digital Library | Akshar Paaul NGO

This document provides complete technical specifications for all public and administrator REST API endpoints exposed by the Go backend service.

---

## 1. Global Response Envelope

All API endpoints return JSON formatted with a standard envelope structure:

### Success Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authorization token"
  }
}
```

---

## 2. Public Endpoints (No Auth Required)

### `GET /api/books`
Fetches a paginated catalog of published books.

#### Query Parameters
- `q` *(string)*: Search text matching title or author name.
- `category` *(integer)*: Filter by Category ID.
- `language` *(integer)*: Filter by Language ID.
- `age_group` *(string)*: Filter by age group (`5-8`, `9-12`, `13+`, `All Ages`).
- `sort` *(string)*: Sorting order (`title` for A-Z, `newest` for recent additions).
- `page` *(integer, default `1`)*: Page number.
- `limit` *(integer, default `12`)*: Records per page.

#### Example Response
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "c6a2b8e4-1234-4567-89ab-cdef01234567",
        "title": "Alice's Adventures in Wonderland",
        "author_name": "Lewis Carroll",
        "description": "A young girl named Alice falls through a rabbit hole into a fantasy world...",
        "language_id": 1,
        "language_name": "English",
        "category_id": 1,
        "category_name": "Children's Literature",
        "age_group": "9-12",
        "publication_year": 1865,
        "cover_url": "http://localhost:8080/storage/covers/c6a2b8e4.jpg",
        "rights_status": "PUBLIC_DOMAIN",
        "published": true,
        "created_at": "2026-09-30T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 12
  }
}
```

---

### `GET /api/books/{id}`
Returns details for a specific published book.

---

### `GET /api/books/{id}/read`
Logs a reading event (anonymous analytics) and returns a 1-hour pre-signed or local stream URL for both PDF and EPUB formats.

#### Response
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:8080/api/books/c6a2b8e4-1234-4567-89ab-cdef01234567/epub",
    "format": "epub",
    "has_pdf": true,
    "has_epub": true,
    "pdf_url": "http://localhost:8080/api/books/c6a2b8e4-1234-4567-89ab-cdef01234567/pdf",
    "epub_url": "http://localhost:8080/api/books/c6a2b8e4-1234-4567-89ab-cdef01234567/epub"
  }
}
```

---

### `GET /api/books/{id}/pdf`
Proxies the raw PDF binary stream (`application/pdf`) directly to the PDF reader.

---

### `GET /api/books/{id}/epub`
Proxies the raw EPUB binary stream (`application/epub+zip`) directly to the EPUB reader.

---

### `GET /api/categories`
Returns array of available book categories.

---

### `GET /api/languages`
Returns array of supported book languages.

---

### `GET /api/authors`
Returns array of existing authors.

---

## 3. Authentication Endpoints

### `POST /api/auth/login`
Authenticates an administrator.

#### Request Body
```json
{
  "email": "admin@smilingbooks.org",
  "password": "AdminSmilingBooks2026!"
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "7f8e9d0c-1111-2222-3333-444455556666",
      "name": "Library Administrator",
      "email": "admin@smilingbooks.org",
      "role": "ADMIN"
    }
  }
}
```

---

### `POST /api/auth/logout`
Logs out administrator and invalidates session cookies.

---

## 4. Admin Control Panel Endpoints (Bearer Token Required)

Headers required for all admin endpoints:
```http
Authorization: Bearer <JWT_TOKEN>
```

### `GET /api/admin/books`
Returns all books in catalog, including unpublished and pending review items.

---

### `POST /api/admin/books`
Creates new book metadata.

#### Request Body
```json
{
  "title": "The Secret Garden",
  "author_name": "Frances Hodgson Burnett",
  "description": "Mary Lennox is sent to live at her uncle's estate...",
  "language_name": "English",
  "category_name": "Children's Literature",
  "age_group": "9-12",
  "publication_year": 1911,
  "rights_status": "PUBLIC_DOMAIN",
  "published": false
}
```

---

### `PUT /api/admin/books/{id}`
Updates existing book metadata.

---

### `DELETE /api/admin/books/{id}`
Permanently deletes book metadata record from PostgreSQL and removes associated cover image and PDF document from Cloudflare R2 object storage.

---

### `POST /api/admin/books/{id}/publish`
Publishes book to make it visible in public library catalog.
*Note*: Blocked automatically if `rights_status = 'PENDING_REVIEW'`.

---

### `POST /api/admin/books/{id}/unpublish`
Unpublishes book to hide it from public catalog.

---

### `POST /api/admin/books/{id}/upload-cover`
Uploads cover image file (`multipart/form-data`, file field: `file`). Valid formats: `.jpg`, `.jpeg`, `.png`, `.webp` (Max size: 2MB).

---

### `POST /api/admin/books/{id}/upload-pdf`
Uploads PDF document file (`multipart/form-data`, file field: `file`). Valid formats: `.pdf` (Max size: 50MB).

---

### `POST /api/admin/books/{id}/upload-epub`
Uploads EPUB document file (`multipart/form-data`, file field: `file`). Valid formats: `.epub` (Max size: 50MB).

---

### `POST /api/admin/books/{id}/upload-book`
Uploads either a PDF or EPUB document file (`multipart/form-data`, file field: `file`). Valid formats: `.pdf`, `.epub` (Max size: 50MB).

---

### `GET /api/admin/analytics`
Fetches administrative dashboard metrics (total books, published count, pending review count, total read events, popular books, category distribution).
