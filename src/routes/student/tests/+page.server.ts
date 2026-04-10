import type { PageServerLoad } from './$types';
import { loadStudentTestsPageData } from '$lib/student/tests/loadStudentTestsPage';

/** Cookie auth and API fetch — only server `load` receives `cookies`. */
export const load: PageServerLoad = async ({ fetch, url, cookies }) => {
	return {
		streamed: {
			testsData: loadStudentTestsPageData({ fetch, url, cookies })
		}
	};
};
