import type { PageServerLoad } from './$types';
import { fetchGroupedChaptersByExamSlug } from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';
import type { Question } from '$lib/api/questions';

const QUESTIONS_PAGE_LIMIT = 10;

export const load: PageServerLoad = async ({ params, url }) => {
	const examSlug = params.examSlug;
	const chapterParam = params.chapterParam;

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;

	try {
		const chaptersRes = await fetchGroupedChaptersByExamSlug(examSlug);

		let chapter: any | null = null;
		let resolvedChapterId: string | null = null;
		let currentSubjectChapters: any[] = [];
		let subjectSlug: string | null = null;
		
		if (chaptersRes?.success && Array.isArray((chaptersRes.data as any)?.data)) {
			const groupedSubjectsRaw = ((chaptersRes.data as any)?.data ?? []) as unknown[];
			
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

		const questionsRes = resolvedChapterId
			? await fetchQuestionsByChapter(resolvedChapterId, safePage, QUESTIONS_PAGE_LIMIT)
			: null;

		return {
			examSlug,
			chapterParam,
			safePage,
			resolvedChapterId,
			chapter,
			allChapters: currentSubjectChapters,
			subjectSlug,
			questions: questionsRes?.data ?? [],
			paginationMeta: questionsRes
				? { total: questionsRes.total, lastPage: questionsRes.lastPage, limit: questionsRes.limit }
				: null,
			message: null as string | null
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
			questions: [],
			paginationMeta: null,
			message: e instanceof Error ? e.message : 'Failed to load'
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
	questions: Question[];
	paginationMeta: { total: number; lastPage: number; limit: number } | null;
	message: string | null;
};

