import { resolveApiToken } from '$lib/api/authToken';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestOptions = {
	endpoint: string;
	method?: ApiMethod;
	data?: unknown;
	token?: string | null;
	skipAuth?: boolean;
	headers?: Record<string, string>;
	fetch?: typeof globalThis.fetch;
	signal?: AbortSignal;
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

export const PUBLIC_API_BASE_URL = (
	(typeof import.meta !== 'undefined' &&
		(import.meta as ImportMeta & { env?: { VITE_PUBLIC_API_URL?: string } }).env
			?.VITE_PUBLIC_API_URL) ||
	((globalThis as unknown as { process?: { env?: { VITE_PUBLIC_API_URL?: string } } })
		.process?.env?.VITE_PUBLIC_API_URL as string | undefined) ||
	// 'http://localhost:8000'|| 
  "https://test-exam-backend-yc8u.onrender.com"
).replace(/\/+$/, '');

export async function apiRequest<T>({
	endpoint,
	method = 'GET',
	data,
	token,
	skipAuth = false,
	headers = {},
	fetch: customFetch = fetch,
	signal
}: ApiRequestOptions): Promise<ApiResponse<T>> {
	try {
		const finalHeaders: Record<string, string> = {
			...headers
		};

		if (data !== undefined) {
			finalHeaders['Content-Type'] = 'application/json';
		}

		const bearer = skipAuth ? undefined : resolveApiToken(token);

		if (bearer) {
			finalHeaders['Authorization'] = `Bearer ${bearer}`;
		}

		const response = await customFetch(`${PUBLIC_API_BASE_URL}${endpoint}`, {
			method,
			headers: finalHeaders,
			body: data !== undefined ? JSON.stringify(data) : undefined,
			signal
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