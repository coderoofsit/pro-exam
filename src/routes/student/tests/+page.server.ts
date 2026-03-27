import { fetchGetTestUser } from '$lib/api/tests';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 20;

export const load: PageServerLoad = async ({ fetch, url, cookies }) => {
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

	const token = getAuthTokenFromCookies(cookies);

	if (!token) {
		return {
			items: [],
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
		fetch,
		{ token }
	);

	if (!res.success) {
		return {
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
			items: [],
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
};
