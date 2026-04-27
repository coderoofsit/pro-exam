import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { type GroupedSubjectRow } from '$lib/api/chapters';
import { fetchTopicsByExamSlug, type TopicsByExamSubjectRow } from '$lib/api/topics';
import type { PageServerLoad } from './$types';


export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const { examSlug } = params;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	// Stream the topics response to avoid blocking the page render
	const topicsPromise = fetchTopicsByExamSlug(examSlug, fetch, token);

	return {
		examSlug,
		// We return the raw promise here for SvelteKit to stream it
		streamed: {
			topicsResponse: topicsPromise
		}
	};
};
