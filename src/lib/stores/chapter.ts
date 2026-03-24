import { writable, get } from 'svelte/store';
import type { Chapter } from '$lib/api/chapters';

function cacheKey(boardSlug: string, examSlug: string) {
	return `${boardSlug}:${examSlug}`;
}

type ChapterState = {
	chaptersByKey: Record<string, Chapter[]>;
};

function createChapterStore() {
	const store = writable<ChapterState>({ chaptersByKey: {} });

	return {
		subscribe: store.subscribe,
		setChapters(boardSlug: string, examSlug: string, chapters: Chapter[]) {
			store.update((s) => ({
				chaptersByKey: { ...s.chaptersByKey, [cacheKey(boardSlug, examSlug)]: chapters }
			}));
		},
		getChapters(boardSlug: string, examSlug: string): Chapter[] | undefined {
			return get(store).chaptersByKey[cacheKey(boardSlug, examSlug)];
		},
		getChapterById(boardSlug: string, examSlug: string, chapterId: string): Chapter | undefined {
			const chapters = get(store).chaptersByKey[cacheKey(boardSlug, examSlug)];
			return chapters?.find((ch) => ch._id === chapterId);
		},
		hasChapters(boardSlug: string, examSlug: string): boolean {
			return cacheKey(boardSlug, examSlug) in get(store).chaptersByKey;
		},
		clear() {
			store.set({ chaptersByKey: {} });
		}
	};
}

export const chapterStore = createChapterStore();
