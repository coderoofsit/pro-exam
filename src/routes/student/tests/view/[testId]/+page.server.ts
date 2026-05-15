import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const viewTestId = (params.testId ?? '').trim();
	const subjectSlug = url.searchParams.get('subject') || undefined;

	return {
		viewTestId,
		subjectSlug,
	};
};
