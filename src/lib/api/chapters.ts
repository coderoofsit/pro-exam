import { apiRequest } from '../../http/api';
import { TOKEN } from '$lib/http';

export type Chapter = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug?: string;
};

const getToken = () => (TOKEN.startsWith('Bearer ') ? TOKEN.slice(7) : TOKEN);

export async function fetchChapterBySlug(slug: string, token?: string | null): Promise<Chapter> {
	const t = token ?? getToken();
	const response = await apiRequest<{ success: boolean; message: string; data: Chapter }>({
		endpoint: `/api/v1/chapters?slug=${encodeURIComponent(slug)}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapter');
	return response.data.data;
}

export async function fetchChaptersByBoardAndExam(boardSlug: string, examSlug: string, token?: string | null): Promise<Chapter[]> {
	const t = token ?? getToken();
	const response = await apiRequest<{ success: boolean; message: string; data: Chapter[] }>({
		endpoint: `/api/v1/chapters?boardSlug=${boardSlug}&examSlug=${examSlug}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapters');
	return [...response.data.data].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.name.en.localeCompare(b.name.en);
	});
}
