import type { PageServerLoad } from './$types';
import { fetchGroupedChaptersByExamSlug } from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';
import type { Question } from '$lib/api/questions';

const QUESTIONS_PAGE_LIMIT = 25;
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const ALLOWED_KINDS = ['MCQ', 'MSQ', 'TRUE_FALSE', 'INTEGER', 'FILL_BLANK', 'COMPREHENSION_PASSAGE'] as const;

function parseDifficulties(values: string[]): string[] {
	const allowed = new Set(ALLOWED_DIFFICULTIES);
	const tokens = values
		.flatMap((v) => v.split(','))
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const unique = Array.from(new Set(tokens));
	const filtered = unique.filter((d) => allowed.has(d as (typeof ALLOWED_DIFFICULTIES)[number]));
	return filtered.length ? filtered : ['easy'];
}

function parseKinds(values: string[]): string[] {
	const allowed = new Set(ALLOWED_KINDS);
	const tokens = values
		.flatMap((v) => v.split(','))
		.map((s) => s.trim().toUpperCase())
		.filter(Boolean);
	const unique = Array.from(new Set(tokens));
	return unique.filter((k) => allowed.has(k as (typeof ALLOWED_KINDS)[number]));
}

export const load: PageServerLoad = async ({ params, url }) => {
	const examSlug = params.examSlug;
	const chapterParam = params.chapterParam;
	const activeDifficulties = parseDifficulties(url.searchParams.getAll('difficulty'));
	const activeKinds = parseKinds(url.searchParams.getAll('kind'));

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const previewMode = String(url.searchParams.get('preview') ?? '') === '1';
	const reviewStartParam = Number(url.searchParams.get('reviewStart') || '');
	const requestedReviewStart = Number.isNaN(reviewStartParam) || reviewStartParam < 0 ? null : reviewStartParam;

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
			? await fetchQuestionsByChapter(resolvedChapterId, safePage, QUESTIONS_PAGE_LIMIT, {
					difficulty: activeDifficulties,
					kind: activeKinds.length ? activeKinds : null
				})
			: null;

		// Only use the current page for the initial review pool.
		// This keeps API calls to a single page per request.
		const reviewPoolQuestions: Question[] = questionsRes?.data ?? [];

		return {
			examSlug,
			chapterParam,
			safePage,
			resolvedChapterId,
			chapter,
			allChapters: currentSubjectChapters,
			subjectSlug,
			activeDifficulties,
			activeKinds,
			previewMode,
			requestedReviewStart,
			questions: questionsRes?.data ?? [],
			reviewPoolQuestions,
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
			activeDifficulties,
			activeKinds,
			previewMode,
			requestedReviewStart,
			questions: [],
			reviewPoolQuestions: [],
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
	activeDifficulties: string[];
	activeKinds: string[];
	previewMode: boolean;
	requestedReviewStart: number | null;
	questions: Question[];
	reviewPoolQuestions: Question[];
	paginationMeta: { total: number; lastPage: number; limit: number } | null;
	message: string | null;
};

