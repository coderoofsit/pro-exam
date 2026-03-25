import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type Exam = {
	_id: string;
	name: { en: string; hi?: string };
	slug: string;
	image: string | null;
	order: number;
	isActive: boolean;
	boardSlug: string;
	numberofPapers: number;
	numberofQuestions: number;
	numberofTests: number;
};

export type ExamResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: Exam;
};

export async function fetchExamBySlug(slug: string, token?: string | null): Promise<Exam> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Exam }>({
		endpoint: `/api/v1/exams/by-slug/${slug}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch exam');
	return response.data.data;
}

export type ExamsPageResponse = {
	data: Exam[];
	total: number;
	currentPage: number;
	lastPage: number;
	limit: number;
};

export async function fetchExamsPage(
	page: number,
	limit: number = 8,
	token?: string | null
): Promise<ExamsPageResponse> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: ExamsPageResponse;
	}>({
		endpoint: `/api/v1/exams?page=${page}&limit=${limit}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch exams');
	return response.data.data;
}
