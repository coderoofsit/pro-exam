import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { examSlug } = params;

	// Data is now fetched in the parent +layout.server.ts
	// SvelteKit automatically merges layout data into the page data.
	return {
		examSlug
	};
};
