import type { PageServerLoad } from './$types';
import { fetchExamsPage } from '$lib/api/exams';
import { STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
	const currentPage = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;

	try {
		const res = await fetchExamsPage(currentPage, STUDENT_EXAMS_PAGE_SIZE, token, fetch);
		return {
			exams: res.data,
			total: res.total,
			lastPage: res.lastPage,
			limit: res.limit,
			currentPage,
			message: null as string | null
		};
	} catch (e) {
		return {
			exams: [],
			total: 0,
			lastPage: 1,
			limit: STUDENT_EXAMS_PAGE_SIZE,
			currentPage,
			message: e instanceof Error ? e.message : 'Failed to fetch exams'
		};
	}
};

