import type { LayoutServerLoad } from './$types';

/**
 * Do not block navigation on chapters API here — that doubles latency (browser → SvelteKit → API).
 * Exam and chapter routes hydrate grouped data on the client (direct browser → API) or resolve chapters by slug server-side.
 */
export const load: LayoutServerLoad = async ({ params }) => {
	return {
		examSlug: params.examSlug,
		_rawGrouped: [] as unknown[],
		_chaptersBySubjectSlug: {} as Record<string, unknown>,
	};
};
