import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';
import type { OwnTestDistributionContinueData } from '$lib/ownTest/questionDistribution';

/** GET /api/v1/tests/get-test-user — paginated tests for the logged-in student. */
export type GetTestUserItem = {
	_id: string;
	createdByUserId: { _id: string; firstName: string; lastName: string };
	createdByRole: string;
	ownerUserId: string;
	ownerRole: string;
	name: { en: string; hi?: string };
	slug: string;
	kind: string;
	numberOfSections: number;
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
	attempted: boolean;
	attemptId: string | null;
	batchId: string | null;
};

export type GetTestUserFilterOptions = {
	creators: Array<{
		testsCount: number;
		lastTestAt: string;
		userId: string;
		firstName: string;
		lastName: string;
	}>;
	exams: Array<{
		count: number;
		examId: string;
		name: { en: string; hi?: string };
		slug: string;
		isActive: boolean;
	}>;
	kinds: Array<{ count: number; value: string }>;
	statuses: Array<{ count: number; value: string }>;
};

export type GetTestUserApiResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: {
		items: GetTestUserItem[];
		pagination: { page: number; limit: number; total: number; totalPages: number };
		teacherGroups: unknown[];
		filterOptions: GetTestUserFilterOptions;
	};
};

export type FetchGetTestUserParams = {
	page: number;
	limit: number;
	search: string;
	/** Optional filters — query names depend on backend; empty strings are omitted. */
	creatorUserId?: string;
	examId?: string;
	kind?: string;
	status?: string;
};

export async function fetchGetTestUser(
	params: FetchGetTestUserParams,
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	const q = new URLSearchParams({
		page: String(Math.max(1, params.page)),
		limit: String(Math.min(100, Math.max(1, params.limit)))
	});
	const s = params.search.trim();
	if (s) q.set('search', s);
	const c = params.creatorUserId?.trim();
	if (c) q.set('creatorUserId', c);
	const e = params.examId?.trim();
	if (e) q.set('examId', e);
	const k = params.kind?.trim();
	if (k) q.set('kind', k);
	const st = params.status?.trim();
	if (st) q.set('status', st);

	return apiRequest<GetTestUserApiResponse>({
		endpoint: `/api/v1/tests/get-test-user?${q.toString()}`,
		method: 'GET',
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}

export type CreateRandomCustomTestBody = {
	boardId: string;
	examId: string;
	name: { en: string };
	kind: string;
	/** Backend rejects `null` for optional strings — omit keys when not scheduling. */
	settings: {
		durationMinutes: number;
		startDate?: string;
		startTime?: string;
		endDate?: string;
		endTime?: string;
	};
	subjects: OwnTestDistributionContinueData['subjects'];
};

export async function createRandomCustomTest(
	body: CreateRandomCustomTestBody,
	token?: string | null
) {
	const t = resolveApiToken(token);
	return apiRequest<unknown>({
		endpoint: '/api/v1/tests/create-random-test',
		method: 'POST',
		data: body,
		token: t
	});
}

export type CreateManualCustomTestBody = {
	boardId: string;
	examId: string;
	name: { en: string };
	kind: string;
	settings: {
		durationMinutes: number;
		startDate?: string;
		startTime?: string;
		endDate?: string;
		endTime?: string;
	};
	questions: Array<{ questionId: string; order?: number }>;
};

export async function createManualCustomTest(body: CreateManualCustomTestBody, token?: string | null) {
	const t = resolveApiToken(token);
	return apiRequest<unknown>({
		endpoint: '/api/v1/tests',
		method: 'POST',
		data: body,
		token: t
	});
}
