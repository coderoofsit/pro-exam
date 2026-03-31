import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { fetchQuestionsByChapter, fetchQuestionById } from '$lib/api/questions';
import { fetchChapterById, fetchChapterBySlug } from '$lib/api/chapters';
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

	try {
		const parentData = await parent();
		const groupedSubjectsRaw = ((parentData as any)._rawGrouped ?? []) as unknown[];

		let chapter: any | null = null;
		let resolvedChapterId: string | null = null;
		let currentSubjectChapters: any[] = [];
		let subjectSlug: string | null = null;
		
		if (groupedSubjectsRaw.length > 0) {
			const isId = chapterParam && isMongoObjectIdString(chapterParam);
			const chapterSlug = isId ? null : decodeURIComponent(chapterParam ?? '');
			
			for (const row of groupedSubjectsRaw) {
				const subject = (row as any).subject;
				const chapters: any[] = [];
				
				for (const unit of (row as any).data ?? []) {
					for (const ch of unit.data ?? []) {
						chapters.push(ch);
						
						if (!chapter) {
							if (isId && ch._id === chapterParam) {
								chapter = ch;
								resolvedChapterId = ch._id;
								currentSubjectChapters = chapters;
								subjectSlug = subject?.slug ?? null;
							} else if (chapterSlug && ch.slug === chapterSlug) {
								chapter = ch;
								resolvedChapterId = ch._id;
								currentSubjectChapters = chapters;
								subjectSlug = subject?.slug ?? null;
							}
						}
					}
				}
				
				if (chapter && currentSubjectChapters.length > 0) break;
			}
		}

		if (!resolvedChapterId && chapterParam) {
			const isId = isMongoObjectIdString(chapterParam);
			try {
				const chDoc = isId
					? await fetchChapterById(chapterParam)
					: await fetchChapterBySlug(decodeURIComponent(chapterParam));
				if (chDoc) {
					chapter = chDoc;
					resolvedChapterId = chDoc._id;
				}
			} catch (err) {
				console.error('Chapter resolve by slug/id failed', err);
			}
		}

		let questionsRes: Awaited<ReturnType<typeof fetchQuestionsByChapter>> | null = null;
		let detailedQuestion: Question | null = null;

		if (resolvedChapterId) {
			const listPromise = fetchQuestionsByChapter(
				resolvedChapterId,
				safePage,
				QUESTIONS_PAGE_LIMIT,
				difficulty,
				kind
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
			chapter,
			allChapters: currentSubjectChapters,
			subjectSlug,
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
			chapter: null,
			allChapters: [],
			subjectSlug: null,
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
	chapter: any | null;
	allChapters: any[];
	subjectSlug: string | null;
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

