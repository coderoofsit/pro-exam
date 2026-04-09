import type { PageServerLoad } from './$types';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchExamBySlug } from '$lib/api/exams';
import {
	fetchChaptersByChapterGroupId,
	fetchChaptersHierarchy,
	fetchChapterBySlug,
	type ChaptersHierarchyResponse,
	type Chapter
} from '$lib/api/chapters';
import { fetchQuestionsByChapter } from '$lib/api/questions';
import { isMongoObjectIdString } from '$lib/chapterRoutes';

const QUESTIONS_PAGE_LIMIT = 10;

export const load: PageServerLoad = async ({ params, url, fetch, cookies }) => {
	const examSlug = params.examSlug;
	const subjectSlug = params.subjectSlug;
	const chapterParam = params.chapterParam;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	const currentPageParam = Number(url.searchParams.get('page') || '1');
	const safePage = Number.isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;

	try {
		const examFromApi = (await fetchExamBySlug(examSlug, token, fetch)) as any;
		const boardSlug: string | undefined = examFromApi?.boardSlug ?? examFromApi?.board_slug;
		const slug: string | undefined = examFromApi?.slug ?? examFromApi?._id ?? examSlug;

		if (!boardSlug) throw new Error('Board slug not found for this exam');
		if (!slug) throw new Error('Exam slug not found for this exam');

		const hierarchy = (await fetchChaptersHierarchy(
			boardSlug,
			slug,
			token,
			fetch
		)) as ChaptersHierarchyResponse;
		const subject = (hierarchy.subjects ?? []).find((s: any) => s.slug === subjectSlug) ?? null;

		const chapterGroupsChapters: Record<string, Chapter[]> = {};
		for (const cg of subject?.chapterGroups ?? []) {
			const res = await fetchChaptersByChapterGroupId(cg._id, token);
			const chapters = Array.isArray(res) ? res : (res as { data: Chapter[] }).data;
			chapterGroupsChapters[cg._id] = chapters;
		}

		let resolvedChapterId: string | null = null;
		if (chapterParam && isMongoObjectIdString(chapterParam)) {
			resolvedChapterId = chapterParam;
		} else {
			const chapterSlug = decodeURIComponent(chapterParam ?? '');
			const ch = await fetchChapterBySlug(chapterSlug, token);
			resolvedChapterId = ch._id;
		}

		const questionsRes = resolvedChapterId
			? await fetchQuestionsByChapter(
					resolvedChapterId,
					safePage,
					QUESTIONS_PAGE_LIMIT,
					undefined,
					undefined,
					token
				)
			: null;

		return {
			examSlug,
			boardSlug,
			subjectSlug,
			chapterParam,
			safePage,
			resolvedChapterId,
			hierarchy,
			subject,
			chapterGroupsChapters,
			questions: questionsRes?.data ?? [],
			paginationMeta: questionsRes
				? { total: questionsRes.total, lastPage: questionsRes.lastPage, limit: questionsRes.limit }
				: null,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			boardSlug: '',
			subjectSlug,
			chapterParam,
			safePage,
			resolvedChapterId: null,
			hierarchy: null,
			subject: null,
			chapterGroupsChapters: {} as Record<string, Chapter[]>,
			questions: [],
			paginationMeta: null,
			message: e instanceof Error ? e.message : 'Failed to load'
		};
	}
};

