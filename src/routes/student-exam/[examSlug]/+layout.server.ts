import type { LayoutServerLoad } from './$types';
import { fetchGroupedChaptersByExamSlug, fetchChaptersByChapterGroupId } from '$lib/api/chapters';

type ChapterLite = { _id: string; slug?: string; order?: number; name?: { en: string; hi?: string } };
type ChapterCardRow = {
	chapter: ChapterLite;
	groupName: string;
	groupOrder: number;
};

type CachedData = {
	_rawGrouped: unknown[];
	chaptersBySubjectSlug: Record<string, ChapterCardRow[]>;
	timestamp: number;
};

const chaptersCache = new Map<string, CachedData>();
const CACHE_TTL = 5 * 60 * 1000;

export const load: LayoutServerLoad = async ({ params }) => {
	const examSlug = params.examSlug;

	const cached = chaptersCache.get(examSlug);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return {
			_rawGrouped: cached._rawGrouped,
			_chaptersBySubjectSlug: cached.chaptersBySubjectSlug
		};
	}

	try {
		const chaptersRes = await fetchGroupedChaptersByExamSlug(examSlug);
		const groupedPayload = chaptersRes?.success ? (chaptersRes.data as { data?: unknown[] } | null) : null;
		const groupedList = Array.isArray(groupedPayload?.data) ? groupedPayload.data : [];

		const chaptersBySubjectSlug: Record<string, ChapterCardRow[]> = {};

		if (groupedList.length > 0) {
			for (const row of groupedList) {
				const subject = (row as any).subject;
				if (!subject?._id || !subject?.slug) continue;

				const chapters: ChapterCardRow[] = [];
				
				for (const unit of (row as any).data ?? []) {
					const cg = unit.chapterGroup;
					const groupName = cg?.name?.en ?? cg?.slug ?? '';
					const groupOrder = cg?.order ?? 0;

					for (const ch of unit.data ?? []) {
						chapters.push({
							chapter: ch as ChapterLite,
							groupName,
							groupOrder
						});
					}
				}

				chaptersBySubjectSlug[subject.slug] = chapters.sort((a, b) => {
					if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
					return (a.chapter.order ?? 0) - (b.chapter.order ?? 0);
				});
			}
		}

		const cacheData: CachedData = {
			_rawGrouped: groupedList,
			chaptersBySubjectSlug,
			timestamp: Date.now()
		};

		chaptersCache.set(examSlug, cacheData);

		return {
			_rawGrouped: groupedList,
			_chaptersBySubjectSlug: chaptersBySubjectSlug
		};
	} catch (e) {
		return {
			_rawGrouped: [],
			_chaptersBySubjectSlug: {}
		};
	}
};
