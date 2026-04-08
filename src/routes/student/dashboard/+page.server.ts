import type { PageServerLoad } from './$types';
import { fetchExamsPage } from '$lib/api/exams';
import { STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

const DASHBOARD_EXAMS_PAGE = 1;

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	try {
		const res = await fetchExamsPage(DASHBOARD_EXAMS_PAGE, STUDENT_EXAMS_PAGE_SIZE, token, fetch);
		return {
			exams: res.data,
			message: null as string | null
		};
	} catch (e) {
		return {
			exams: [],
			message: e instanceof Error ? e.message : 'Failed to fetch exams'
		};
	}
};

