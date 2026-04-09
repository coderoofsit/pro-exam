import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchExamBySlug } from '$lib/api/exams';
import { fetchChaptersHierarchy } from '$lib/api/chapters';
import type { ChaptersHierarchyResponse } from '$lib/api/chapters';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const examSlug = params.examSlug;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	try {
		const examFromApi = (await fetchExamBySlug(examSlug, token, fetch)) as any;

		const boardSlug: string | undefined = examFromApi?.boardSlug ?? examFromApi?.board_slug;
		const slug: string | undefined = examFromApi?.slug ?? examFromApi?._id ?? examSlug;

		if (!boardSlug) throw new Error('Board slug not found for this exam');
		if (!slug) throw new Error('Exam slug not found for this exam');

		const hierarchy = (await fetchChaptersHierarchy(
			boardSlug,
			slug,
			token,
			fetch
		)) as ChaptersHierarchyResponse;

		return {
			examSlug,
			exam: {
				...examFromApi,
				boardSlug,
				slug
			},
			hierarchy,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			exam: null,
			hierarchy: null,
			message: e instanceof Error ? e.message : 'Failed to fetch subjects'
		};
	}
};

