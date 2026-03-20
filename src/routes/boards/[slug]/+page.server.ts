import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchBoardBySlug } from '$lib/api/boards';
import { fetchExamsByBoard } from '$lib/api/exams';

function normalizeToken(value: string | null | undefined): string | null {
	if (!value) return null;
	return value.startsWith('Bearer ') ? value.slice(7) : value;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const token = normalizeToken(cookies.get('auth_token')) ?? null;
	try {
		const board = await fetchBoardBySlug(params.slug);
		const exams = await fetchExamsByBoard(board._id, token);
		return { exams, board };
	} catch (e) {
		throw error(500, (e as Error).message);
	}
};
