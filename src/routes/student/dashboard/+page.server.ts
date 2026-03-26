import type { PageServerLoad } from './$types';
import { fetchExamsPage } from '$lib/api/exams';
import { STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';

const DASHBOARD_EXAMS_PAGE = 1;

export const load: PageServerLoad = async () => {
	try {
		const res = await fetchExamsPage(DASHBOARD_EXAMS_PAGE, STUDENT_EXAMS_PAGE_SIZE);
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

