import type { PageServerLoad } from './$types';
import type { Exam } from '$lib/api/exams';

/**
 * Do not block navigation on `/api/v1/exams/all` (slow cold starts / SSR to public API).
 * Exams load in the browser via `getExamsClient` in `+page.svelte`.
 */
export const load: PageServerLoad = async () => {
	return {
		exams: [] as Exam[],
		examsLoadError: null as string | null
	};
};
