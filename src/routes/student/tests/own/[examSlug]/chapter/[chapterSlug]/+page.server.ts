import type { PageServerLoad } from './$types';
import { fetchChapterBySlug } from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';

const QUESTIONS_PAGE_LIMIT = 25;

export const load: PageServerLoad = async ({ params, url }) => {
	const examSlug = params.examSlug;
	const chapterSlug = params.chapterSlug;
	const examId = String(url.searchParams.get('examId') ?? '').trim();
	const boardId = String(url.searchParams.get('boardId') ?? '').trim();

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const kind = url.searchParams.get('kind');
	const topicSlug = url.searchParams.get('topic');
	const difficulty = url.searchParams.get('difficulty');

	try {
		const chapter = await fetchChapterBySlug(decodeURIComponent(chapterSlug));
		const chapterId = chapter?._id ?? null;
		if (!chapterId) throw new Error('Chapter not found');

		const questionsRes = await fetchQuestionsByChapter(chapterId, safePage, QUESTIONS_PAGE_LIMIT, difficulty, kind, null, topicSlug);

		return {
			examSlug,
			examId,
			boardId,
			chapterSlug,
			safePage,
			chapter,
			chapterId,
			questions: questionsRes?.data ?? [],
			paginationMeta: questionsRes
				? { total: questionsRes.total, lastPage: questionsRes.lastPage, limit: questionsRes.limit }
				: null,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			examId,
			boardId,
			chapterSlug,
			safePage,
			chapter: null,
			chapterId: null,
			questions: [],
			paginationMeta: null,
			message: e instanceof Error ? e.message : 'Failed to load'
		};
	}
};

