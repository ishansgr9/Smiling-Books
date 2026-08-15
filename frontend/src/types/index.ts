export interface Author {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Language {
  id: number;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  author_id: number;
  author_name: string;
  description: string;
  language_id: number;
  language_name: string;
  category_id: number;
  category_name: string;
  age_group: string;
  publication_year: number | null;
  cover_object_key: string | null;
  cover_url: string | null;
  pdf_object_key: string | null;
  rights_status: 'PUBLIC_DOMAIN' | 'LICENSED' | 'PERMISSION_GRANTED' | 'PENDING_REVIEW';
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PopularBook {
  id: string;
  title: string;
  author_name: string;
  read_count: number;
}

export interface CategoryStat {
  category_name: string;
  book_count: number;
}

export interface Analytics {
  total_books: number;
  published_books: number;
  pending_review: number;
  total_reads: number;
  popular_books: PopularBook[] | null;
  category_stats: CategoryStat[] | null;
}

export interface APIError {
  code: string;
  message: string;
}

export interface JSONResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  message?: string;
}
