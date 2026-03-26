import { resolveApiToken } from '$lib/api/authToken';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestOptions = {
  endpoint: string;
  method?: ApiMethod;
  data?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
  status: number;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  status: number;
  error?: unknown;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

const BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_PUBLIC_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_PUBLIC_API_URL) || 
  // "http://localhost:8000" ||
  'https://test-exam-backend-5yh6.onrender.com';

export async function apiRequest<T>({
  endpoint,
  method = 'GET',
  data,
  token,
  headers = {},
  fetch: customFetch = fetch
}: ApiRequestOptions): Promise<ApiResponse<T>> {
  try {
    const finalHeaders: Record<string, string> = {
      ...headers
    };

    if (data !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    const bearer = resolveApiToken(token);
    if (bearer) {
      finalHeaders['Authorization'] = `Bearer ${bearer}`;
    }

    const response = await customFetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: finalHeaders,
      body: data !== undefined ? JSON.stringify(data) : undefined
    });

    let result: any = null;

    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      return {
        success: false,
        message: result?.message || 'Something went wrong',
        status: response.status,
        error: result
      };
    }
    return {
      success: true,
      data: result,
      message: result?.message,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
      status: 500,
      error
    };
  }
}