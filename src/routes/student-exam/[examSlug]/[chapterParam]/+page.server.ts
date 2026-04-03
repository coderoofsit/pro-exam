import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { fetchQuestionsByChapter, fetchQuestionById } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';
import type { Question } from '$lib/api/questions';

const QUESTIONS_PAGE_LIMIT = 25;

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const examSlug = params.examSlug;
	const chapterParam = params.chapterParam;

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const previewMode = String(url.searchParams.get('preview') ?? '') === '1';
	const reviewStartParam = Number(url.searchParams.get('reviewStart') || '');
	const requestedReviewStart = Number.isNaN(reviewStartParam) || reviewStartParam < 0 ? null : reviewStartParam;
	const questionId = url.searchParams.get('questionId');
	const difficulty = url.searchParams.get('difficulty');
	const kind = url.searchParams.get('kind');
	const topicSlug = url.searchParams.get('topic');

	try {
		let resolvedChapterId: string | null = null;

		if (chapterParam && isMongoObjectIdString(chapterParam)) {
			resolvedChapterId = chapterParam;
		}

		let questionsRes: Awaited<ReturnType<typeof fetchQuestionsByChapter>> | null = null;
		let detailedQuestion: Question | null = null;

		if (resolvedChapterId) {
			const listPromise = fetchQuestionsByChapter(
				resolvedChapterId,
				safePage,
				QUESTIONS_PAGE_LIMIT,
				difficulty,
				kind,
				null,
				topicSlug
			);
			if (questionId) {
				const [list, detail] = await Promise.all([
					listPromise,
					fetchQuestionById(questionId).catch((err) => {
						console.error('Failed to fetch detailed question', err);
						return null;
					})
				]);
				questionsRes = list;
				detailedQuestion = detail;
			} else {
				questionsRes = await listPromise;
			}
		} else if (questionId) {
			try {
				detailedQuestion = await fetchQuestionById(questionId);
			} catch (err) {
				console.error('Failed to fetch detailed question', err);
			}
		}

		// Only use the current page for the initial review pool.
		const reviewPoolQuestions: Question[] = questionsRes?.data ?? [];

		return {
			examSlug,
			chapterParam,
			safePage,
			resolvedChapterId,
			previewMode,
			requestedReviewStart,
			questions: questionsRes?.data ?? [],
			reviewPoolQuestions,
			paginationMeta: questionsRes
				? { total: questionsRes.total, lastPage: questionsRes.lastPage, limit: questionsRes.limit }
				: null,
			message: null as string | null,
			questionId,
			detailedQuestion
		};
	} catch (e) {
		return {
			examSlug,
			chapterParam,
			safePage,
			resolvedChapterId: null,
			previewMode,
			requestedReviewStart,
			questions: [],
			reviewPoolQuestions: [],
			paginationMeta: null,
			message: e instanceof Error ? e.message : 'Failed to load',
			questionId: null,
			detailedQuestion: null
		};
	}
};

export type PageData = {
	examSlug: string;
	chapterParam: string;
	safePage: number;
	resolvedChapterId: string | null;
	previewMode: boolean;
	requestedReviewStart: number | null;
	questions: Question[];
	reviewPoolQuestions: Question[];
	paginationMeta: { total: number; lastPage: number; limit: number } | null;
	message: string | null;
	questionId: string | null;
	detailedQuestion: Question | null;
};

export const actions: Actions = {
	updateQuestion: async ({ request }) => {
		const data = await request.formData();
		const questionId = data.get('questionId')?.toString();
		if (!questionId) return fail(400, { message: 'Missing question ID' });

		try {
			const existing = await fetchQuestionById(questionId);
			if (!existing) return fail(404, { message: 'Question not found' });

			const promptContent = data.get('promptContent')?.toString() ?? existing.prompt?.en?.content ?? '';
			const explanationContent = data.get('explanationContent')?.toString() ?? existing.prompt?.en?.explanation ?? '';
			
			const newOptions = [...(existing.prompt?.en?.options || [])];
			let i = 0;
			while (data.has(`option_${i}_id`)) {
				const id = data.get(`option_${i}_id`)?.toString();
				const content = data.get(`option_${i}_content`)?.toString() ?? '';
				const optIdx = newOptions.findIndex(o => o.identifier === id);
				if (optIdx !== -1) {
					newOptions[optIdx].content = content;
				}
				i++;
			}

			const updatedPrompt = {
				...(existing.prompt || {}),
				en: {
					...(existing.prompt?.en || {}),
					content: promptContent,
					explanation: explanationContent,
					options: newOptions
				}
			};

			const { updateQuestion } = await import('$lib/api/questions');
			await updateQuestion(questionId, { prompt: updatedPrompt });
			return { success: true };
		} catch (err: any) {
			console.error('Update failed:', err);
			return fail(500, { message: err.message || 'Update failed' });
		}
	}
};

