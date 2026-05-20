import type { PageServerLoad } from './$types';
import type { Exam } from '$lib/api/exams';

/**
 * Exams are loaded in the browser — see `+page.svelte` — so navigation is not blocked on SSR.
 */
export const load: PageServerLoad = async () => {
	return {
		exams: [] as Exam[],
		examsLoadError: null as string | null
	};
};
