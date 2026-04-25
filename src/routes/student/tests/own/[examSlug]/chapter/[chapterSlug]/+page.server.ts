import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchTopicsByChapterSlug } from '$lib/api/topics';
import { fetchQuestionsByChapter } from '$lib/api/questions';

const QUESTIONS_PAGE_LIMIT = 25;

export const load: PageServerLoad = async ({ params, url, cookies, fetch }) => {
	const examSlug = params.examSlug;
	const chapterSlug = params.chapterSlug;
	const token = getAuthTokenFromCookies(cookies) ?? null;
	const examId = String(url.searchParams.get('examId') ?? '').trim();
	const boardId = String(url.searchParams.get('boardId') ?? '').trim();

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const kind = url.searchParams.get('kind');
	const topicSlug = url.searchParams.get('topic');
	const difficulty = url.searchParams.get('difficulty');

	try {
		// Consolidate: Fetch Chapter metadata AND Topics in one call
		const topicsRes = await fetchTopicsByChapterSlug(decodeURIComponent(chapterSlug), fetch, { token });
		
		if (!topicsRes.success || !topicsRes.data) {
			throw new Error(topicsRes.message || 'Chapter topics not found');
		}

		const { chapter, topics } = topicsRes.data;
		const chapterId = chapter?._id ?? null;
		if (!chapterId) throw new Error('Chapter not found');

		const questionsRes = await fetchQuestionsByChapter(
			chapterId,
			safePage,
			QUESTIONS_PAGE_LIMIT,
			difficulty,
			kind,
			token,
			topicSlug,
			null
		);

		return {
			examSlug,
			examId,
			boardId,
			chapterSlug,
			safePage,
			chapter,
			chapterId,
			topics,
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
			topics: [],
			questions: [],
			paginationMeta: null,
			message: e instanceof Error ? e.message : 'Failed to load'
		};
	}
};

