import { apiRequest } from '../../http/api';
import { TOKEN } from '$lib/http';

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
	const response = await apiRequest<{ success: boolean; message: string; data: Board[] }>({
		endpoint: '/api/v1/boards',
		method: 'GET',
		headers: { Authorization: TOKEN, 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch boards');
	return response.data.data.sort((a, b) => a.order - b.order);
}

export async function fetchBoardBySlug(slug: string): Promise<Board> {
	const boards = await fetchBoards();
	const board = boards.find((b) => b.slug === slug);
	if (!board) throw new Error(`Board not found: ${slug}`);
	return board;
}
