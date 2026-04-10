import { fetchStudentBatches } from '$lib/api/batch';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

const LIMIT = 25;

export const load: PageServerLoad = async ({ fetch, url, cookies }) => {
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const search = (url.searchParams.get('search') ?? '').trim();

	const token = getAuthTokenFromCookies(cookies);

	return {
		search,
		page: pageNum,
		limit: LIMIT,
		streamed: {
			batchesData: fetchStudentBatches({ page: pageNum, limit: LIMIT, search }, fetch, { token })
				.then(res => res.success ? res.data : null)
				.catch(() => null)
		},
		ssrAuthMissing: !token
	};
};
