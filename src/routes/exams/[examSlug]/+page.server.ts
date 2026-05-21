import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import {
	fetchGroupedChaptersByExamSlug,
	type GroupedSubjectRow
} from '$lib/api/chapters';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const examSlug = params.examSlug ?? '';
	const token = getAuthTokenFromCookies(cookies) ?? null;

	try {
		const res = await fetchGroupedChaptersByExamSlug(examSlug, fetch, token);
		if (!res.success) {
			return {
				examSlug,
				grouped: [] as GroupedSubjectRow[],
				error: res.message || 'Failed to load chapters'
			};
		}
		return {
			examSlug,
			grouped: (res.data?.data ?? []) as GroupedSubjectRow[],
			error: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			grouped: [] as GroupedSubjectRow[],
			error: e instanceof Error ? e.message : 'Failed to load chapters'
		};
	}
};
