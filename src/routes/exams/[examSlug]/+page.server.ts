import type { PageServerLoad } from './$types';
import { fetchGroupedChaptersByExamSlug, type GroupedSubjectRow } from '$lib/api/chapters';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
	const examSlug = params.examSlug ?? '';
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;

	if (!examSlug) {
		return {
			examSlug,
			grouped: [] as GroupedSubjectRow[],
			error: 'Missing exam',
			loaded: true
		};
	}

	if (!token?.trim()) {
		return {
			examSlug,
			grouped: [] as GroupedSubjectRow[],
			error: null,
			loaded: false
		};
	}

	try {
		const res = await fetchGroupedChaptersByExamSlug(examSlug, fetch, token);
		if (!res.success) {
			return {
				examSlug,
				grouped: [] as GroupedSubjectRow[],
				error: res.message || 'Failed to load chapters',
				loaded: true
			};
		}

		const grouped = (res.data?.data ?? []) as GroupedSubjectRow[];
		return {
			examSlug,
			grouped,
			error: null,
			loaded: true
		};
	} catch (e) {
		return {
			examSlug,
			grouped: [] as GroupedSubjectRow[],
			error: e instanceof Error ? e.message : 'Failed to load chapters',
			loaded: true
		};
	}
};
