import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchQuestionsByChapter } from '$lib/api/questions';

export const load: PageServerLoad = async ({ params, url }) => {
	try {
		const chapterId = params.chapterId;
		const page = Number(url.searchParams.get('page') || '1');
		const result = await fetchQuestionsByChapter(chapterId, page);

		return {
			chapterId,
			message: result.message,
			total: result.total,
			currentPage: result.currentPage,
			lastPage: result.lastPage,
			limit: result.limit,
			questions: result.data
		};
	} catch (e) {
		throw error(500, e instanceof Error ? e.message : 'Failed to fetch questions');
	}
};
