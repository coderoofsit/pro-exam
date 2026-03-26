import type { PageServerLoad } from './$types';
import { fetchStudentExamSubjectsAndChapters } from '$lib/api/chapters';
import { fetchGroupedChaptersByExamSlug } from '$lib/api/chapters';

type SubjectNavRow = {
	_id: string;
	slug: string;
	name?: { en: string; hi?: string };
	unitCount: number;
};

type ChapterLite = { _id: string; slug?: string; order?: number; name?: { en: string; hi?: string } };
type ChapterCardRow = { chapter: ChapterLite; groupName: string; groupOrder: number };

export const load: PageServerLoad = async ({ params }) => {
	const examSlug = params.examSlug;

	try {
		// Fast path: single backend call that returns grouped (ideally cached in Redis).
		// If backend isn't updated / returns wrong shape, fall back to the assembled strategy.
		const apiRes = await fetchGroupedChaptersByExamSlug(examSlug);

		if (apiRes.success && Array.isArray((apiRes.data as any)?.data) && (apiRes.data as any).data.length) {
			const groupedSubjectsRaw = ((apiRes.data as any)?.data ?? []) as unknown[];
			const groupedSubjects = groupedSubjectsRaw.filter((row): row is any => {
				const r = row as any;
				return Boolean(r?.subject?._id && r?.subject?.slug);
			});

			if (groupedSubjects.length) {
				const subjects = groupedSubjects
					.map((row): SubjectNavRow => ({
						_id: row.subject._id,
						slug: row.subject.slug,
						name: row.subject.name,
						unitCount: row.data?.length ?? 0
					}))
					.filter((s) => Boolean(s._id && s.slug));

				const chaptersBySubjectSlug: Record<string, ChapterCardRow[]> = {};

				for (const row of groupedSubjects) {
					const out: ChapterCardRow[] = [];
					for (const unit of row.data ?? []) {
						const cg = unit.chapterGroup;
						for (const ch of unit.data ?? []) {
							out.push({
								chapter: ch as unknown as ChapterLite,
								groupName: cg.name?.en ?? cg.slug ?? '',
								groupOrder: (cg as any).order ?? 0
							});
						}
					}

					chaptersBySubjectSlug[row.subject.slug] = out.sort((a, b) => {
						if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
						return (a.chapter.order ?? 0) - (b.chapter.order ?? 0);
					});
				}

				const initialSubjectSlug = subjects[0]?.slug ?? '';

				return {
					examSlug,
					exam: null,
					hierarchy: null,
					subjects,
					chaptersBySubjectSlug,
					initialSubjectSlug,
					message: null as string | null
				};
			}
		}

		// Fallback (works with current backend everywhere): exam -> boardSlug -> hierarchy -> chapters by chapterGroupId.
		const res = await fetchStudentExamSubjectsAndChapters(examSlug);

		const subjects = (res.hierarchy?.subjects ?? [])
			.map((s): SubjectNavRow => ({
				_id: s._id,
				slug: s.slug,
				name: s.name,
				unitCount: s.chapterGroups?.length ?? 0
			}))
			.filter((s) => Boolean(s._id && s.slug));

		const chaptersBySubjectSlug: Record<string, ChapterCardRow[]> = {};

		for (const s of res.hierarchy?.subjects ?? []) {
			const out: ChapterCardRow[] = [];
			for (const cg of s.chapterGroups ?? []) {
				const chapters = res.chapterGroupsChapters?.[cg._id] ?? [];
				for (const ch of chapters) {
					out.push({
						chapter: ch as unknown as ChapterLite,
						groupName: cg.name?.en ?? cg.slug ?? '',
						groupOrder: (cg as any).order ?? 0
					});
				}
			}

			chaptersBySubjectSlug[s.slug] = out.sort((a, b) => {
				if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
				return (a.chapter.order ?? 0) - (b.chapter.order ?? 0);
			});
		}

		const initialSubjectSlug = subjects[0]?.slug ?? '';

		return {
			examSlug,
			exam: res.exam,
			hierarchy: res.hierarchy as any,
			subjects,
			chaptersBySubjectSlug,
			initialSubjectSlug,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			exam: null,
			hierarchy: null,
			subjects: [] as SubjectNavRow[],
			chaptersBySubjectSlug: {} as Record<string, ChapterCardRow[]>,
			initialSubjectSlug: '',
			message: e instanceof Error ? e.message : 'Failed to load custom data'
		};
	}
};

