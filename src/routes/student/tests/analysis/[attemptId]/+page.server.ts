import type { PageServerLoad } from './$types';
import { fetchTestAttemptById } from '$lib/api/testAttempts';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch, cookies, url }) => {
	const attemptId = params.attemptId;
	const token = getAuthTokenFromCookies(cookies);
	const testName = url.searchParams.get('testName') || '';

	if (!token) {
		throw error(401, 'Sign in to view analysis.');
	}

	const res = await fetchTestAttemptById(attemptId, fetch, { token });

	if (!res.success) {
		throw error(res.status || 500, res.message || 'Failed to load analysis.');
	}

	return {
		summary: res.data,
		testName,
		attemptId
	};
};
