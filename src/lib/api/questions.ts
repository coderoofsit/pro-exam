import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

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

export async function fetchQuestionsByChapter(
	chapterId: string,
	page: number = 1,
	limit: number = 10,
	token?: string | null
): Promise<QuestionsPageResponse> {
	const t = resolveApiToken(token);
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

export async function fetchQuestionsByChapterGroup(
	chapterGroupId: string,
	page: number = 1,
	limit: number = 10,
	opts?: { pyqOnly?: boolean },
	token?: string | null
): Promise<QuestionsPageResponse> {
	const t = resolveApiToken(token);
	const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
	const safeLimit = Math.min(100, Math.max(1, limit));
	const params = new URLSearchParams({
		chapterGroupId,
		page: String(safePage),
		limit: String(safeLimit)
	});
	if (opts?.pyqOnly) params.set('pyqOnly', 'true');
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: QuestionsPageResponse;
	}>({
		endpoint: `/api/v1/questions?${params.toString()}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch questions');
	return response.data.data;
}
