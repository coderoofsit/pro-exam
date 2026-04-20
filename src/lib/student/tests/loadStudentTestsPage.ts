import type { Cookies } from '@sveltejs/kit';
import { fetchGetTestUser, type GetTestUserItem } from '$lib/api/tests';
import { fetchTestAttemptById, type TestAttemptSummary } from '$lib/api/testAttempts';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';

const DEFAULT_LIMIT = 5;

async function loadAttemptAnalysis(
	url: URL,
	fetchFn: typeof fetch,
	token: string | null
): Promise<{
	analysisAttemptId: string | null;
	analysisTestName: string | null;
	attemptAnalysis: TestAttemptSummary | null;
	attemptAnalysisError: string | null;
}> {
	const analysisAttemptId = (url.searchParams.get('analysisAttemptId') ?? '').trim();
	const analysisTestName = (url.searchParams.get('analysisTestName') ?? '').trim();
	const base = {
		analysisAttemptId: analysisAttemptId || null,
		analysisTestName: analysisTestName || null,
		attemptAnalysis: null as TestAttemptSummary | null,
		attemptAnalysisError: null as string | null
	};
	if (!analysisAttemptId) return base;
	if (!token) {
		return { ...base, attemptAnalysisError: 'Sign in to view analysis.' };
	}
	const ar = await fetchTestAttemptById(analysisAttemptId, fetchFn, { token });
	if (ar.success) {
		return { ...base, attemptAnalysis: ar.data };
	}
	return { ...base, attemptAnalysisError: ar.message };
}

export async function loadStudentTestsPageData(opts: {
	fetch: typeof fetch;
	url: URL;
	cookies: Cookies;
}) {
	const { fetch: fetchFn, url, cookies } = opts;

	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(
		100,
		Math.max(1, parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
	);
	const search = (url.searchParams.get('search') ?? '').trim();
	const creatorUserId = (url.searchParams.get('creatorUserId') ?? '').trim();
	const examId = (url.searchParams.get('examId') ?? '').trim();
	const kind = (url.searchParams.get('kind') ?? '').trim();
	const status = (url.searchParams.get('status') ?? '').trim();

	const token = getAuthTokenFromCookies(cookies) ?? null;
	const analysis = await loadAttemptAnalysis(url, fetchFn, token);

	if (!token) {
		return {
			...analysis,
			items: [] as GetTestUserItem[],
			pagination: null,
			filterOptions: null,
			teacherGroups: [],
			error: null as string | null,
			ssrAuthMissing: true as const,
			search,
			page: pageNum,
			limit,
			creatorUserId,
			examId,
			kind,
			status
		};
	}

	const res = await fetchGetTestUser(
		{ page: pageNum, limit, search, creatorUserId, examId, kind, status },
		fetchFn,
		{ token }
	);

	if (!res.success) {
		return {
			...analysis,
			items: [],
			pagination: null,
			filterOptions: null,
			teacherGroups: [],
			error: res.message,
			ssrAuthMissing: false as const,
			search,
			page: pageNum,
			limit,
			creatorUserId,
			examId,
			kind,
			status
		};
	}

	const body = res.data;
	const payload = body?.data;
	if (!payload) {
		return {
			...analysis,
			items: [] as GetTestUserItem[],
			pagination: null,
			filterOptions: null,
			teacherGroups: [],
			error: 'Unexpected response from server.',
			ssrAuthMissing: false as const,
			search,
			page: pageNum,
			limit,
			creatorUserId,
			examId,
			kind,
			status
		};
	}

	return {
		...analysis,
		items: payload.items ?? [],
		pagination: payload.pagination ?? null,
		filterOptions: payload.filterOptions ?? null,
		teacherGroups: payload.teacherGroups ?? [],
		error: null as string | null,
		ssrAuthMissing: false as const,
		search,
		page: pageNum,
		limit,
		creatorUserId,
		examId,
		kind,
		status
	};
}
