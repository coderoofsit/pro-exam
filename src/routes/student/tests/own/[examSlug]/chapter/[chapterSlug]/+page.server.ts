import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchTopicsByChapterSlug, type TopicRow } from '$lib/api/topics';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';

const QUESTIONS_PAGE_LIMIT = 25;

function titleFromChapterSlug(slug: string): string {
	return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const load: PageServerLoad = async ({ params, url, cookies, fetch }) => {
	const examSlug = params.examSlug;
	const chapterSlugParam = decodeURIComponent(params.chapterSlug ?? '');
	const token = getAuthTokenFromCookies(cookies) ?? null;
	const examId = String(url.searchParams.get('examId') ?? '').trim();
	const boardId = String(url.searchParams.get('boardId') ?? '').trim();

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;
	const kind = url.searchParams.get('kind');
	const topicSlug = url.searchParams.get('topic');
	const difficulty = url.searchParams.get('difficulty');

	const isChapterId = isMongoObjectIdString(chapterSlugParam);
	const chapterId = isChapterId ? chapterSlugParam : null;
	const chapterSlugForApi = isChapterId ? null : chapterSlugParam;

	const topicsPromise = fetchTopicsByChapterSlug(chapterSlugParam, fetch, { token }).then((res) => {
		if (!res.success || !res.data) {
			return {
				chapter: null as { _id?: string; name?: { en?: string } } | null,
				topics: [] as TopicRow[]
			};
		}
		return res.data;
	});

	const questionsPromise = fetchQuestionsByChapter(
		chapterId,
		safePage,
		QUESTIONS_PAGE_LIMIT,
		difficulty,
		kind,
		token,
		topicSlug,
		chapterSlugForApi,
		null
	);

	return {
		examSlug,
		examId,
		boardId,
		chapterSlug: chapterSlugParam,
		chapterTitle: titleFromChapterSlug(chapterSlugParam),
		safePage,
		chapter: null,
		chapterId,
		topics: [],
		streamed: {
			topicsMeta: topicsPromise,
			questionsRes: questionsPromise
		},
		message: null as string | null
	};
};
