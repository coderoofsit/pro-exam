import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchTopicsByExamSlug } from '$lib/api/topics';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, fetch, cookies }) => {
	const { examSlug } = params;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	// Stream the topics response to avoid blocking the page render
	// Putting this in a layout allows SvelteKit to reuse the data when navigating
	// between child pages (like chapter details) and this parent page.
	const topicsPromise = fetchTopicsByExamSlug(examSlug, fetch, token);

	return {
		examSlug,
		streamed: {
			topicsResponse: topicsPromise
		}
	};
};
