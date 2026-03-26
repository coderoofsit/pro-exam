import { apiRequest } from '../../http/api';

export type StudentBatchCreator = {
	_id: string;
	firstName: string;
	lastName: string;
};

export type StudentBatchItem = {
	_id: string;
	name: string;
	/** Human-readable slug from API (list may still show it); detail route uses `_id`. */
	slug: string;
	numberOfStudents: number;
	numberOfTeachers: number;
	numberOfTests: number;
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	status: string;
	isActive: boolean;
	createdByUser: StudentBatchCreator;
};

/** Response body from GET /api/v1/batch/student */
export type StudentBatchesListBody = {
	success: boolean;
	statusCode: number;
	message: string;
	currentPage: number;
	lastPage: number;
	total: number;
	data: StudentBatchItem[];
};

export type FetchStudentBatchesParams = {
	page: number;
	limit: number;
	search: string;
};

export async function fetchStudentBatches(
	params: FetchStudentBatchesParams,
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	const q = new URLSearchParams({
		limit: String(Math.min(100, Math.max(1, params.limit))),
		page: String(Math.max(1, params.page))
	});
	const trimmed = params.search.trim();
	if (trimmed) q.set('search', trimmed);

	/**
	 * - **SSR**: pass `token` from `cookies.get('auth_token')` (mirrors localStorage).
	 * - **Browser**: omit `token` so `resolveApiToken()` reads `auth_token` from localStorage.
	 */
	return apiRequest<StudentBatchesListBody>({
		endpoint: `/api/v1/batch/student?${q.toString()}`,
		method: 'GET',
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}

/** Nested payload from GET /api/v1/batch/student/:batchId */
export type StudentBatchDetailPayload = {
	batch: {
		_id: string;
		name: string;
		status: string;
		isActive: boolean;
		startDate: string;
		startTime: string;
		endDate: string;
		endTime: string;
	};
	currentPage: number;
	lastPage: number;
	total: number;
	limit: number;
	data: StudentBatchAssignedTest[];
};

export type StudentBatchAssignedTest = {
	_id: string;
	name: { en?: string };
	kind: string;
	settings: {
		durationMinutes: number | null;
		startsAt?: string | null;
		endsAt?: string | null;
		startDate: string | null;
		startTime: string | null;
		endDate: string | null;
		endTime: string | null;
	};
	questionCount: number;
	totalMarks: number;
	isActive: boolean;
	status: string;
	testId: string;
	assignedAt: string;
	isAssignedActive: boolean;
	attempted: boolean;
};

/** Full JSON body from GET /api/v1/batch/student/:batchId */
export type StudentBatchDetailBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: StudentBatchDetailPayload;
};

export type FetchStudentBatchDetailParams = {
	page?: number;
	limit?: number;
};

/**
 * SSR: pass `token` from `getAuthTokenFromCookies(cookies)`.
 * `batchId` is the batch Mongo `_id` (same as `GET /api/v1/batch/student/:batchId`).
 */
export async function fetchStudentBatchDetail(
	batchId: string,
	params: FetchStudentBatchDetailParams | undefined,
	fetchFn: typeof fetch | undefined,
	options?: { token?: string }
) {
	const q = new URLSearchParams();
	const page = params?.page;
	const limit = params?.limit;
	if (page != null && page > 0) q.set('page', String(page));
	if (limit != null && limit > 0) q.set('limit', String(Math.min(100, limit)));
	const qs = q.toString();
	const path = `/api/v1/batch/student/${encodeURIComponent(batchId)}`;
	const endpoint = qs ? `${path}?${qs}` : path;

	return apiRequest<StudentBatchDetailBody>({
		endpoint,
		method: 'GET',
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}
