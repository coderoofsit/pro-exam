import { apiRequest } from '../../http/api';
import { TOKEN } from '$lib/http';

export type QuestionOption = {
	identifier: string;
	content: string;
	images?: string[];
};

export type QuestionPrompt = {
	content: string;
	images?: string[];
	options?: QuestionOption[];
	explanation?: string;
	explanationImages?: string[];
};

export type Question = {
	_id: string;
	kind: string;
	difficulty: string;
	prompt: {
		en: QuestionPrompt;
	};
};

export type QuestionsPageResponse = {
	total: number;
	currentPage: number;
	lastPage: number;
	limit: number;
	data: Question[];
	message?: string;
};

const getToken = () => (TOKEN.startsWith('Bearer ') ? TOKEN.slice(7) : TOKEN);

export async function fetchQuestionsByChapter(
	chapterId: string,
	page: number = 1,
	limit: number = 10,
	token?: string | null
): Promise<QuestionsPageResponse> {
	const t = token ?? getToken();
	const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
	const safeLimit = Math.min(100, Math.max(1, limit));
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: QuestionsPageResponse;
	}>({
		endpoint: `/api/v1/questions?chapterId=${encodeURIComponent(chapterId)}&page=${safePage}&limit=${safeLimit}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch questions');
	return response.data.data;
}
