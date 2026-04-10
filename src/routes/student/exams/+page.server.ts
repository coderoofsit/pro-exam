import type { PageServerLoad } from './$types';
import { fetchExamsPage } from '$lib/api/exams';
import { STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

export const load: PageServerLoad = async ({ url, cookies, fetch }) => {
	const currentPage = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;

	return {
		currentPage,
		streamed: {
			examsData: fetchExamsPage(currentPage, STUDENT_EXAMS_PAGE_SIZE, token, fetch)
				.catch(() => ({
					data: [],
					total: 0,
					lastPage: 1,
					limit: STUDENT_EXAMS_PAGE_SIZE,
					currentPage
				}))
		}
	};
};

