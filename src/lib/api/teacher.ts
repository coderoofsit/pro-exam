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

export type FetchBatchStudentsParams = {
	page: number;
	limit: number;
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

	return apiRequest<BatchStudentsResponse>({
		endpoint: `/api/v1/batch/students?${q.toString()}`,
		method: 'GET',
		fetch: fetchFn,
		token: options?.token ?? null
	});
}

