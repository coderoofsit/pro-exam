import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchChapterById, fetchChapterBySlug } from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';

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

export const GET: RequestHandler = async ({ params, url }) => {
	const chapterParam = params.chapterParam;
	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const activeDifficulties = parseDifficulties(url.searchParams.getAll('difficulty'));
	const activeKinds = parseKinds(url.searchParams.getAll('kind'));
	const limitParam = Number(url.searchParams.get('limit') || `${QUESTIONS_PAGE_LIMIT}`);
	const safeLimit = Number.isNaN(limitParam) || limitParam < 1 ? QUESTIONS_PAGE_LIMIT : Math.min(100, limitParam);

	try {
		let resolvedChapterId: string | null = null;

		if (chapterParam && isMongoObjectIdString(chapterParam)) {
			const chapter = await fetchChapterById(chapterParam);
			resolvedChapterId = chapter?._id ?? chapterParam;
		} else {
			const chapterSlug = decodeURIComponent(chapterParam ?? '');
			const chapter = await fetchChapterBySlug(chapterSlug);
			resolvedChapterId = chapter?._id ?? null;
		}

		if (!resolvedChapterId) {
			return json({ questions: [], paginationMeta: null });
		}

		const questionsRes = await fetchQuestionsByChapter(resolvedChapterId, safePage, safeLimit, {
			difficulty: activeDifficulties,
			kind: activeKinds.length ? activeKinds : null
		});

		return json({
			questions: questionsRes?.data ?? [],
			paginationMeta: questionsRes
				? {
						total: questionsRes.total,
						lastPage: questionsRes.lastPage,
						limit: questionsRes.limit
					}
				: null
		});
	} catch (e) {
		return json({ questions: [], paginationMeta: null }, { status: 500 });
	}
};
