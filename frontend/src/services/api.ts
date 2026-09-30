import type { JSONResponse } from '../types';

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return envUrl.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
    }
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return 'http://localhost:8080';
};

class APIClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are in the admin dashboard, redirect to login
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login?expired=true';
      }
    }

    let result: JSONResponse<T>;
    try {
      result = await response.json();
    } catch (e) {
      throw new Error(`Invalid JSON response: ${response.statusText}`);
    }

    if (!response.ok || !result.success) {
      const errorMsg = result.error?.message || response.statusText || 'An unknown error occurred';
      const error = new Error(errorMsg) as any;
      error.code = result.error?.code || 'API_ERROR';
      error.status = response.status;
      throw error;
    }

    return result.data as T;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  // File Upload Helper
  async uploadFile<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response);
  }
}

export const api = new APIClient();
export default api;
