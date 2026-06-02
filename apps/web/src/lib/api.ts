import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiResponse } from '@eduportal/shared';

const STORAGE_KEY = 'eduportal-auth';

interface PersistedAuth {
  state: { token: string | null };
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

function clearTokenAndRedirect(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearTokenAndRedirect();
    }
    return Promise.reject(error);
  }
);

export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    const message = response.data.message ?? 'Request failed';
    const error = new Error(message) as Error & { errors?: Record<string, string[]> };
    error.errors = response.data.errors;
    throw error;
  }
  if (response.data.data === undefined) {
    throw new Error('Response missing data');
  }
  return response.data.data;
}

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    axiosInstance.get<ApiResponse<T>>(url, { params }).then(unwrap<T>),
  post: <T>(url: string, data?: unknown) =>
    axiosInstance.post<ApiResponse<T>>(url, data).then(unwrap<T>),
  patch: <T>(url: string, data?: unknown) =>
    axiosInstance.patch<ApiResponse<T>>(url, data).then(unwrap<T>),
  put: <T>(url: string, data?: unknown) =>
    axiosInstance.put<ApiResponse<T>>(url, data).then(unwrap<T>),
  delete: <T>(url: string) =>
    axiosInstance.delete<ApiResponse<T>>(url).then(unwrap<T>),
};

export { axiosInstance };
