import type { PageServerLoad } from './$types';
import { getExamsServerSafe } from '$lib/api/exams';

export const load: PageServerLoad = async ({ fetch }) => {
	const { exams, message, examsLoadError } = await getExamsServerSafe(fetch);

	return {
		exams,
		message,
		examsLoadError
	};
};