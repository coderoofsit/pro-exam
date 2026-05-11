import type { GroupedSubjectRow } from '$lib/api/chapters';

type ChapterLite = {
	_id: string;
	slug?: string;
	order?: number;
	name?: { en: string; hi?: string };
};

export type ChapterCardRow = {
	chapter: ChapterLite;
	groupName: string;
	groupOrder: number;
};

export type SubjectNavRow = {
	_id: string;
	slug: string;
	name?: { en: string; hi?: string };
	unitCount: number;
};

/** Same shape as `[examSlug]/+layout.server.ts` processing of grouped API payload. */
export function buildChaptersBySubjectFromGrouped(
	groupedList: GroupedSubjectRow[],
): Record<string, ChapterCardRow[]> {
	const chaptersBySubjectSlug: Record<string, ChapterCardRow[]> = {};

	for (const row of groupedList) {
		const subject = row.subject;
		if (!subject?._id || !subject?.slug) continue;

		const chapters: ChapterCardRow[] = [];

		for (const unit of row.data ?? []) {
			const cg = unit.chapterGroup as { order?: number; name?: { en?: string }; slug?: string };
			const groupName = cg?.name?.en ?? cg?.slug ?? '';
			const groupOrder = cg?.order ?? 0;

			for (const ch of unit.data ?? []) {
				chapters.push({
					chapter: ch as ChapterLite,
					groupName,
					groupOrder,
				});
			}
		}

		chaptersBySubjectSlug[subject.slug] = chapters.sort((a, b) => {
			if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
			return (a.chapter.order ?? 0) - (b.chapter.order ?? 0);
		});
	}

	return chaptersBySubjectSlug;
}

/** Same subject list as `[examSlug]/+page.server.ts` when using grouped chapters. */
export function buildSubjectsFromGrouped(
	groupedList: GroupedSubjectRow[],
	chaptersBySubjectSlug: Record<string, ChapterCardRow[]>,
): SubjectNavRow[] {
	const groupedSubjects = groupedList.filter((row) =>
		Boolean(row?.subject?._id && row?.subject?.slug),
	);

	return groupedSubjects
		.map(
			(row): SubjectNavRow => ({
				_id: row.subject._id,
				slug: row.subject.slug,
				name: row.subject.name,
				unitCount: chaptersBySubjectSlug[row.subject.slug]?.length ?? 0,
			}),
		)
		.filter((s) => Boolean(s._id && s.slug && s.unitCount > 0));
}

/** For chapter page sidebar when layout data was empty: find the subject chapter list containing `chapterId`. */
export function findSubjectChaptersForChapter(
	groupedList: GroupedSubjectRow[],
	chapterId: string,
): { chapters: ChapterLite[]; subjectSlug: string | null } {
	for (const row of groupedList) {
		const subject = row.subject;
		const chapters: ChapterLite[] = [];
		for (const unit of row.data ?? []) {
			for (const ch of unit.data ?? []) {
				chapters.push(ch as ChapterLite);
			}
		}
		if (chapters.some((c) => c._id === chapterId)) {
			return { chapters, subjectSlug: subject?.slug ?? null };
		}
	}
	return { chapters: [], subjectSlug: null };
}
