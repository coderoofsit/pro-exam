import { apiRequest } from '../../http/api';

export type BatchStudentUserProfileId = {
	_id: string;
	email?: string;
	phone?: string;
};

export type BatchStudentItem = {
	_id: string;
	firstName?: string;
	lastName?: string;
	image?: string | null;
	userProfileId?: BatchStudentUserProfileId;
};

export type BatchStudentsResponse = {
	success: true;
	statusCode: number;
	message: string;
	data: {
		mode: string;
		currentPage: number;
		lastPage: number;
		total: number;
		data: BatchStudentItem[];
	};
};

/** Parse list payload from GET /api/v1/batch/students after `apiRequest` (body is the whole JSON). */
export function unwrapBatchStudentsPage(res: {
	success: boolean;
	data?: BatchStudentsResponse;
}): { rows: BatchStudentItem[]; currentPage: number; lastPage: number } | null {
	if (!res.success || !res.data?.data) return null;
	const page = res.data.data;
	const rows = page.data;
	if (!Array.isArray(rows)) return null;
	return {
		rows,
		currentPage: page.currentPage ?? 1,
		lastPage: page.lastPage ?? 1
	};
}

export type FetchBatchStudentsParams = {
	page: number;
	limit: number;
	search?: string;
};

export async function fetchBatchStudents(
	params: FetchBatchStudentsParams,
	fetchFn?: typeof fetch,
	options?: { token?: string | null }
) {
	const q = new URLSearchParams({
		page: String(Math.max(1, params.page)),
		limit: String(Math.min(100, Math.max(1, params.limit)))
	});
	const search = params.search?.trim();
	if (search) q.set('search', search);
	// Avoid 304 responses on infinite-scroll requests so callers always receive a JSON body.
	q.set('_ts', String(Date.now()));

	return apiRequest<BatchStudentsResponse>({
		endpoint: `/api/v1/batch/students?${q.toString()}`,
		method: 'GET',
		fetch: fetchFn,
		token: options?.token ?? null
	});
}

export type BatchTeachersResponse = {
	success: true;
	statusCode: number;
	message: string;
	data: {
		mode: string;
		currentPage: number;
		lastPage: number;
		total: number;
		data: BatchStudentItem[]; // Reusing the same item structure as they share common fields
	};
};

/** Parse list payload from GET /api/v1/batch/teachers after `apiRequest`. */
export function unwrapBatchTeachersPage(res: {
	success: boolean;
	data?: BatchTeachersResponse;
}): { rows: BatchStudentItem[]; currentPage: number; lastPage: number } | null {
	if (!res.success || !res.data?.data) return null;
	const page = res.data.data;
	const rows = page.data;
	if (!Array.isArray(rows)) return null;
	return {
		rows,
		currentPage: page.currentPage ?? 1,
		lastPage: page.lastPage ?? 1
	};
}

export async function fetchBatchTeachers(
	params: FetchBatchStudentsParams,
	fetchFn?: typeof fetch,
	options?: { token?: string | null }
) {
	const q = new URLSearchParams({
		page: String(Math.max(1, params.page)),
		limit: String(Math.min(100, Math.max(1, params.limit)))
	});
	const search = params.search?.trim();
	if (search) q.set('search', search);
	q.set('_ts', String(Date.now()));

	return apiRequest<BatchTeachersResponse>({
		endpoint: `/api/v1/batch/teachers?${q.toString()}`,
		method: 'GET',
		fetch: fetchFn,
		token: options?.token ?? null
	});
}
