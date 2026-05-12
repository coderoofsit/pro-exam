import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchInstituteUsers, unwrapInstituteUsersPage } from '$lib/api/instituteUsers';

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
	const token = getAuthTokenFromCookies(cookies) ?? null;
	const pageNum = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1);
	const limit = Math.min(
		Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 1),
		100
	);
	const search = (url.searchParams.get('search') ?? '').trim();

	return {
		ssrAuthMissing: !token?.trim(),
		streamed: {
			usersList: token?.trim()
				? fetchInstituteUsers({
						role: 'teacher',
						token,
						fetchFn: fetch,
						page: pageNum,
						limit,
						search: search || undefined
					}).then((res) => unwrapInstituteUsersPage(res))
				: Promise.resolve(null)
		}
	};
};
