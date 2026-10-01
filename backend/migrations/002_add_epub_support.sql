-- 002_add_epub_support.sql
-- Add EPUB format storage key to books table

ALTER TABLE books ADD COLUMN IF NOT EXISTS epub_object_key VARCHAR(500);
