import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchChapterById, fetchChapterBySlug } from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';

const QUESTIONS_PAGE_LIMIT = 25;

export const GET: RequestHandler = async ({ params, url }) => {
	const chapterParam = params.chapterParam;
	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
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

		const questionsRes = await fetchQuestionsByChapter(resolvedChapterId, safePage, safeLimit);

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
