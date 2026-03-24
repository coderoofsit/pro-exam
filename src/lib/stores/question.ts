import { writable, get } from 'svelte/store';
import type { Question } from '$lib/api/questions';

function cacheKey(chapterId: string) {
	return chapterId;
}

type QuestionChapterState = {
	questionsByPage: Record<number, Question[]>;
	total: number;
	lastPage: number;
	limit: number;
};

type QuestionState = {
	byChapter: Record<string, QuestionChapterState>;
};

function createQuestionStore() {
	const store = writable<QuestionState>({ byChapter: {} });

	return {
		subscribe: store.subscribe,
		setQuestionsPage(
			chapterId: string,
			page: number,
			questions: Question[],
			pagination?: { total: number; lastPage: number; limit: number }
		) {
			const key = cacheKey(chapterId);
			store.update((s) => {
				const existing = s.byChapter[key] ?? {
					questionsByPage: {},
					total: 0,
					lastPage: 0,
					limit: 8
				};
				const next = {
					...existing,
					questionsByPage: { ...existing.questionsByPage, [page]: questions }
				};
				if (pagination) {
					next.total = pagination.total;
					next.lastPage = pagination.lastPage;
					next.limit = pagination.limit;
				}
				return {
					byChapter: { ...s.byChapter, [key]: next }
				};
			});
		},
		getQuestionsForPage(chapterId: string, page: number): Question[] | undefined {
			return get(store).byChapter[cacheKey(chapterId)]?.questionsByPage[page];
		},
		getPagination(chapterId: string): { total: number; lastPage: number; limit: number } | undefined {
			const ch = get(store).byChapter[cacheKey(chapterId)];
			if (!ch) return undefined;
			return { total: ch.total, lastPage: ch.lastPage, limit: ch.limit };
		},
		hasPage(chapterId: string, page: number): boolean {
			return page in (get(store).byChapter[cacheKey(chapterId)]?.questionsByPage ?? {});
		},
		clearChapter(chapterId: string) {
			store.update((s) => {
				const next = { ...s.byChapter };
				delete next[cacheKey(chapterId)];
				return { byChapter: next };
			});
		},
		clear() {
			store.set({ byChapter: {} });
		}
	};
}

export const questionStore = createQuestionStore();
