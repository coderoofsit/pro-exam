import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchBoardBySlug } from '$lib/api/boards';
import { fetchExamsByBoard } from '$lib/api/exams';

export const load: PageServerLoad = async ({ fetch, params }) => {
	try {
		const board = await fetchBoardBySlug(params.slug, fetch);
		const exams = await fetchExamsByBoard(board._id, fetch);
		return { exams, board };
	} catch (e) {
		throw error(500, (e as Error).message);
	}
};
