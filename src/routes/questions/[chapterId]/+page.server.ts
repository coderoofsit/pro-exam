import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { renderLatexText } from '$lib/server/mathjax';

type QuestionOption = {
	identifier: string;
	content: string;
	images?: string[];
};

type QuestionPrompt = {
	content: string;
	images?: string[];
	options?: QuestionOption[];
	explanation?: string;
	explanationImages?: string[];
};

type Question = {
	_id: string;
	kind: string;
	difficulty: string;
	prompt: {
		en: QuestionPrompt;
	};
};

type QuestionsApiResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: {
		total: number;
		currentPage: number;
		lastPage: number;
		limit: number;
		data: Question[];
	};
};
const base_url = "https://test-exam-backend-5yh6.onrender.com"

const API_BASE = `${base_url}/api/v1/questions`;

const TOKEN =
	'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YTAyMjAzNmY0OGI2NTM1YzA3MGFiYiIsIm93bmVkQnkiOm51bGwsIm93bmVkUm9sZSI6bnVsbCwicm9sZSI6Imluc3RpdHV0ZSIsImlhdCI6MTc3Mzc1OTY1Mn0.Zb2vZB4ErKGvEAcy8IKmgAiimKeBL455m5TnEWMtyMQ';

export const load: PageServerLoad = async ({ fetch, params, url }) => {
	const chapterId = params.chapterId;
	const page = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(page) || page < 1 ? 1 : page;

	const apiUrl = `${API_BASE}?chapterId=${chapterId}&page=${safePage}`;

	const res = await fetch(apiUrl, {
		method: 'GET',
		headers: {
			Authorization: TOKEN,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) {
		throw error(res.status, 'Failed to fetch questions');
	}

	const result: QuestionsApiResponse = await res.json();

	if (!result.success) {
		throw error(500, result.message || 'Unable to fetch questions');
	}

	const questions = result.data.data.map((question) => {
		const prompt = question.prompt.en;

		return {
			...question,
			prompt: {
				en: {
					...prompt,
					renderedContent: renderLatexText(prompt.content),
					renderedExplanation: renderLatexText(prompt.explanation || ''),
					options:
						prompt.options?.map((option) => ({
							...option,
							renderedContent: renderLatexText(option.content)
						})) || []
				}
			}
		};
	});

	return {
		chapterId,
		message: result.message,
		total: result.data.total,
		currentPage: result.data.currentPage,
		lastPage: result.data.lastPage,
		limit: result.data.limit,
		questions
	};
};