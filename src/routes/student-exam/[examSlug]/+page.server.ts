import type { PageServerLoad } from './$types';
import {
	fetchChaptersHierarchy,
	type GroupedSubjectRow
} from '$lib/api/chapters';
import { fetchExamBySlug } from '$lib/api/exams';

type SubjectNavRow = {
	_id: string;
	slug: string;
	name?: { en: string; hi?: string };
	/** Chapter count (grouped path) or unit count (fallback path). */
	unitCount: number;
};

type ChapterLite = { _id: string; slug?: string; order?: number; name?: { en: string; hi?: string } };
export type ChapterCardRow = { chapter: ChapterLite; groupName: string; groupOrder: number };

export type ChapterGroupMeta = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug?: string;
};

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const examSlug = params.examSlug;

	try {
		const layoutData = await parent();
		const groupedList = ((layoutData as any)._rawGrouped ?? []) as GroupedSubjectRow[];
		const chaptersBySubjectSlug = ((layoutData as any)._chaptersBySubjectSlug ?? {}) as Record<string, ChapterCardRow[]>;

		if (groupedList.length > 0) {
			const groupedSubjects = groupedList.filter((row) => Boolean(row?.subject?._id && row?.subject?.slug));

			const subjects = groupedSubjects
				.map((row): SubjectNavRow => ({
					_id: row.subject._id,
					slug: row.subject.slug,
					name: row.subject.name,
					unitCount: chaptersBySubjectSlug[row.subject.slug]?.length ?? 0
				}))
				.filter((s) => Boolean(s._id && s.slug && s.unitCount > 0));

			return {
				examSlug,
				exam: null,
				hierarchy: null,
				subjects,
				chaptersBySubjectSlug,
				chapterGroupsBySubjectSlug: {} as Record<string, ChapterGroupMeta[]>,
				fullChaptersFromGrouped: true,
				initialSubjectSlug: '',
				message: null as string | null,
				_rawGrouped: groupedList
			};
		}

		const examFromApi = await fetchExamBySlug(examSlug, null, fetch);
		if (!examFromApi) throw new Error('Exam not found');

		const examRecord = examFromApi as Record<string, unknown> & {
			boardSlug?: string;
			board_slug?: string;
			slug?: string;
			_id?: string;
		};

		const boardSlug = (examRecord.boardSlug ?? examRecord.board_slug ?? '') as string;
		const examSlugForHierarchy = (examRecord.slug ?? examRecord._id ?? examSlug) as string;

		if (!boardSlug) throw new Error('Board slug not found for this exam');
		if (!examSlugForHierarchy) throw new Error('Exam slug not found for this exam');

		const hierarchy = await fetchChaptersHierarchy(boardSlug, examSlugForHierarchy, null, fetch);

		const chapterGroupsBySubjectSlug: Record<string, ChapterGroupMeta[]> = {};

		const subjects = (hierarchy.subjects ?? [])
			.map((s): SubjectNavRow => {
				const groups = [...(s.chapterGroups ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
				chapterGroupsBySubjectSlug[s.slug] = groups.map((cg) => ({
					_id: cg._id,
					name: cg.name,
					order: cg.order ?? 0,
					slug: cg.slug
				}));
				return {
					_id: s._id,
					slug: s.slug,
					name: s.name,
					unitCount: groups.length
				};
			})
			.filter((s) => Boolean(s._id && s.slug && s.unitCount > 0));

		const exam = {
			...examRecord,
			boardSlug,
			slug: examSlugForHierarchy
		};

		return {
			examSlug,
			exam,
			hierarchy: null,
			subjects,
			chaptersBySubjectSlug: {} as Record<string, ChapterCardRow[]>,
			chapterGroupsBySubjectSlug,
			fullChaptersFromGrouped: false,
			initialSubjectSlug: '',
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			exam: null,
			hierarchy: null,
			subjects: [] as SubjectNavRow[],
			chaptersBySubjectSlug: {} as Record<string, ChapterCardRow[]>,
			chapterGroupsBySubjectSlug: {} as Record<string, ChapterGroupMeta[]>,
			fullChaptersFromGrouped: false,
			initialSubjectSlug: '',
			message: e instanceof Error ? e.message : 'Failed to load custom data'
		};
	}
};
