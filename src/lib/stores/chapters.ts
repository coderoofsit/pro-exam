import { writable, get } from 'svelte/store';
import type { GroupedSubjectRow } from '$lib/api/chapters';

type ChaptersState = {
	groupedByExamSlug: Record<string, GroupedSubjectRow[]>;
};

function createChaptersStore() {
	const store = writable<ChaptersState>({
		groupedByExamSlug: {}
	});

	return {
		subscribe: store.subscribe,
		setGroupedChapters(examSlug: string, data: GroupedSubjectRow[]) {
			store.update((s) => ({
				...s,
				groupedByExamSlug: { ...s.groupedByExamSlug, [examSlug]: data }
			}));
		},
		getGroupedChapters(examSlug: string): GroupedSubjectRow[] | undefined {
			return get(store).groupedByExamSlug[examSlug];
		},
		hasGroupedChapters(examSlug: string): boolean {
			return examSlug in get(store).groupedByExamSlug;
		},
		clear() {
			store.set({ groupedByExamSlug: {} });
		}
	};
}

export const chaptersStore = createChaptersStore();
