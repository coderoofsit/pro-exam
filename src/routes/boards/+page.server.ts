import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchBoards } from '$lib/api/boards';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const boards = await fetchBoards(fetch);
		return { boards };
	} catch (e) {
		throw error(500, (e as Error).message);
	}
};
