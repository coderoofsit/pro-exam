import { apiRequest } from '../../http/api';

export type StudentBatchCreator = {
	_id: string;
	firstName: string;
	lastName: string;
};

export type StudentBatchItem = {
	_id: string;
	name: string;
	/** Human-readable slug — used in `/student/batch/[slug]` URLs; detail API still uses `_id`. */
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
		/** Present when loaded by slug; optional for older payloads. */
		slug?: string;
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
 * `GET /api/v1/batch/student/:batchId` — **batchId** must be the batch Mongo `_id`.
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

const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * URL uses a human **slug**; the detail API expects Mongo **_id**.
 * - If `segment` is already a 24-char hex id, returns it.
 * - Otherwise loads the student batch list and finds the row with matching `slug` (paginates up to `maxPages`).
 */
export async function resolveStudentBatchIdFromUrlSegment(
	segment: string,
	fetchFn: typeof fetch,
	options: { token: string; maxPages?: number }
): Promise<string | null> {
	const s = segment.trim();
	if (!s) return null;
	if (MONGO_ID_RE.test(s)) return s;

	const maxPages = Math.min(50, Math.max(1, options.maxPages ?? 30));
	const limit = 100;

	// Fast path: search may match name/slug on the first page
	const searchFirst = await fetchStudentBatches(
		{ page: 1, limit, search: s },
		fetchFn,
		{ token: options.token }
	);
	if (searchFirst.success && searchFirst.data?.data) {
		const hit = searchFirst.data.data.find((b) => b.slug === s || b._id === s);
		if (hit) return hit._id;
	}

	for (let page = 1; page <= maxPages; page++) {
		const res = await fetchStudentBatches({ page, limit, search: '' }, fetchFn, {
			token: options.token
		});
		if (!res.success || !res.data) return null;
		const items = res.data.data ?? [];
		const hit = items.find((b) => b.slug === s);
		if (hit) return hit._id;
		const lastPage = res.data.lastPage ?? 1;
		if (page >= lastPage) break;
	}

	return null;
}
