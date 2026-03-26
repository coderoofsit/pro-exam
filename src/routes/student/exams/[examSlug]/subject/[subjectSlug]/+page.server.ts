import type { PageServerLoad } from './$types';
import { fetchExamBySlug } from '$lib/api/exams';
import {
	fetchChaptersByChapterGroupId,
	fetchChaptersHierarchy
} from '$lib/api/chapters';
import type { ChaptersHierarchyResponse, Chapter } from '$lib/api/chapters';

export const load: PageServerLoad = async ({ params }) => {
	const examSlug = params.examSlug;
	const subjectSlug = params.subjectSlug;

	try {
		const examFromApi = (await fetchExamBySlug(examSlug)) as any;

		const boardSlug: string | undefined = examFromApi?.boardSlug ?? examFromApi?.board_slug;
		const slug: string | undefined = examFromApi?.slug ?? examFromApi?._id ?? examSlug;

		if (!boardSlug) throw new Error('Board slug not found for this exam');
		if (!slug) throw new Error('Exam slug not found for this exam');

		const hierarchy = (await fetchChaptersHierarchy(boardSlug, slug)) as ChaptersHierarchyResponse;

		const selectedSubject = hierarchy.subjects.find((s) => s.slug === subjectSlug);
		const chapterGroups = selectedSubject?.chapterGroups ?? [];

		const chapterGroupsChapters: Record<string, Chapter[]> = {};
		for (const cg of chapterGroups) {
			const res = await fetchChaptersByChapterGroupId(cg._id);
			const chapters = Array.isArray(res) ? res : res.data;
			chapterGroupsChapters[cg._id] = chapters;
		}

		return {
			examSlug,
			subjectSlug,
			exam: {
				...examFromApi,
				boardSlug,
				slug
			},
			hierarchy,
			chapterGroupsChapters,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			subjectSlug,
			exam: null,
			hierarchy: null,
			chapterGroupsChapters: {} as Record<string, Chapter[]>,
			message: e instanceof Error ? e.message : 'Failed to load'
		};
	}
};

