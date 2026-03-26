import { fetchStudentBatches } from '$lib/api/batch';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

const LIMIT = 25;

export const load: PageServerLoad = async ({ fetch, url, cookies }) => {
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const search = (url.searchParams.get('search') ?? '').trim();

	const token = getAuthTokenFromCookies(cookies);

	if (!token) {
		return {
			batches: [],
			currentPage: 1,
			lastPage: 1,
			total: 0,
			search,
			page: pageNum,
			limit: LIMIT,
			error: null as string | null,
			ssrAuthMissing: true as const
		};
	}

	const res = await fetchStudentBatches({ page: pageNum, limit: LIMIT, search }, fetch, {
		token
	});

	if (!res.success) {
		return {
			batches: [],
			currentPage: 1,
			lastPage: 1,
			total: 0,
			search,
			page: pageNum,
			limit: LIMIT,
			error: res.message,
			ssrAuthMissing: false as const
		};
	}

	const body = res.data;
	return {
		batches: body.data ?? [],
		currentPage: body.currentPage ?? 1,
		lastPage: body.lastPage ?? 1,
		total: body.total ?? 0,
		search,
		page: pageNum,
		limit: LIMIT,
		error: null as string | null,
		ssrAuthMissing: false as const
	};
};
