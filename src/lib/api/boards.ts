import { BASE_URL, TOKEN } from '$lib/http';

export type Board = {
	_id: string;
	name: { en: string; hi?: string };
	slug: string;
	image: string | null;
	order: number;
	isActive: boolean;
	numberofExams: number;
};

export type BoardsResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: Board[];
};

export async function fetchBoards(fetchFn: typeof fetch = fetch): Promise<Board[]> {
	const res = await fetchFn(`${BASE_URL}/api/v1/boards`, {
		method: 'GET',
		headers: {
			Authorization: TOKEN,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) throw new Error('Failed to fetch boards');

	const result: BoardsResponse = await res.json();
	if (!result.success) throw new Error(result.message || 'Unable to fetch boards');

	return result.data.sort((a, b) => a.order - b.order);
}

export async function fetchBoardBySlug(slug: string, fetchFn: typeof fetch = fetch): Promise<Board> {
	const boards = await fetchBoards(fetchFn);
	const board = boards.find((b) => b.slug === slug);
	if (!board) throw new Error(`Board not found: ${slug}`);
	return board;
}
