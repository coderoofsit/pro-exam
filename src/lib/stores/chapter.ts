import { writable, get } from 'svelte/store';
import type { Chapter, SubjectWithGroups, ChaptersHierarchyResponse } from '$lib/api/chapters';

function hierarchyKey(boardSlug: string, examSlug: string) {
	return `${boardSlug}:${examSlug}`;
}

/** Stable key for exam + subject + chapter URL slug (sidebar / questions route). */
export function chapterRouteKey(examSlug: string, subjectSlug: string, chapterSlug: string): string {
	return `${examSlug}::${subjectSlug}::${chapterSlug}`;
}

type ChapterState = {
	chaptersByKey: Record<string, Chapter[]>;
	hierarchyByKey: Record<string, ChaptersHierarchyResponse>;
	chaptersByChapterGroupId: Record<string, Chapter[]>;
	/** Resolved chapter ObjectIds from slug (after list scan or fetchChapterBySlug) — avoids repeat API. */
	chapterIdByRouteKey: Record<string, string>;
};

function createChapterStore() {
	const store = writable<ChapterState>({
		chaptersByKey: {},
		hierarchyByKey: {},
		chaptersByChapterGroupId: {},
		chapterIdByRouteKey: {}
	});

	return {
		subscribe: store.subscribe,
		setChapters(boardSlug: string, examSlug: string, chapters: Chapter[]) {
			store.update((s) => ({
				...s,
				chaptersByKey: { ...s.chaptersByKey, [hierarchyKey(boardSlug, examSlug)]: chapters }
			}));
		},
		getChapters(boardSlug: string, examSlug: string): Chapter[] | undefined {
			return get(store).chaptersByKey[hierarchyKey(boardSlug, examSlug)];
		},
		setHierarchy(boardSlug: string, examSlug: string, hierarchy: ChaptersHierarchyResponse) {
			store.update((s) => ({
				...s,
				hierarchyByKey: { ...s.hierarchyByKey, [hierarchyKey(boardSlug, examSlug)]: hierarchy }
			}));
		},
		getHierarchy(boardSlug: string, examSlug: string): ChaptersHierarchyResponse | undefined {
			return get(store).hierarchyByKey[hierarchyKey(boardSlug, examSlug)];
		},
		hasHierarchy(boardSlug: string, examSlug: string): boolean {
			return hierarchyKey(boardSlug, examSlug) in get(store).hierarchyByKey;
		},
		setChaptersByChapterGroupId(chapterGroupId: string, chapters: Chapter[]) {
			store.update((s) => ({
				...s,
				chaptersByChapterGroupId: { ...s.chaptersByChapterGroupId, [chapterGroupId]: chapters }
			}));
		},
		/** Cache slug → chapter id for this exam/subject so navigation does not repeat fetchChapterBySlug. */
		rememberChapterRoute(examSlug: string, subjectSlug: string, chapterSlug: string, chapterId: string) {
			const k = chapterRouteKey(examSlug, subjectSlug, chapterSlug);
			store.update((s) => ({
				...s,
				chapterIdByRouteKey: { ...s.chapterIdByRouteKey, [k]: chapterId }
			}));
		},
		getChaptersByChapterGroupId(chapterGroupId: string): Chapter[] | undefined {
			return get(store).chaptersByChapterGroupId[chapterGroupId];
		},
		hasChaptersForChapterGroup(chapterGroupId: string): boolean {
			return chapterGroupId in get(store).chaptersByChapterGroupId;
		},
		getChapterById(boardSlug: string, examSlug: string, chapterId: string): Chapter | undefined {
			const chapters = get(store).chaptersByKey[hierarchyKey(boardSlug, examSlug)];
			return chapters?.find((ch) => ch._id === chapterId);
		},
		/**
		 * Resolve chapter `_id` from URL slug using hierarchy + per-group chapter lists already in the store.
		 * Returns undefined if hierarchy or the chapter list for that group is not loaded yet.
		 */
		findChapterIdBySlug(
			boardSlug: string,
			examSlug: string,
			subjectSlug: string,
			chapterSlug: string
		): string | undefined {
			const s = get(store);
			const routeKey = chapterRouteKey(examSlug, subjectSlug, chapterSlug);
			const cached = s.chapterIdByRouteKey[routeKey];
			if (cached) return cached;

			const h = s.hierarchyByKey[hierarchyKey(boardSlug, examSlug)];
			if (!h?.subjects?.length) return undefined;
			const subj = h.subjects.find((x) => x.slug === subjectSlug);
			if (!subj?.chapterGroups?.length) return undefined;
			for (const cg of subj.chapterGroups) {
				const list = s.chaptersByChapterGroupId[cg._id];
				const ch = list?.find((c) => c.slug === chapterSlug);
				if (ch) {
					store.update((st) => ({
						...st,
						chapterIdByRouteKey: { ...st.chapterIdByRouteKey, [routeKey]: ch._id }
					}));
					return ch._id;
				}
			}
			return undefined;
		},
		hasChapters(boardSlug: string, examSlug: string): boolean {
			return hierarchyKey(boardSlug, examSlug) in get(store).chaptersByKey;
		},
		clear() {
			store.set({
				chaptersByKey: {},
				hierarchyByKey: {},
				chaptersByChapterGroupId: {},
				chapterIdByRouteKey: {}
			});
		}
	};
}

export const chapterStore = createChapterStore();
