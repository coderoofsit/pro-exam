import { writable, get } from 'svelte/store';
import type { Question } from '$lib/api/questions';

function cacheKey(chapterId: string, filters?: string) {
	return filters ? `${chapterId}::${filters}` : chapterId;
}

type QuestionChapterState = {
	questionsByPage: Record<number, Question[]>;
	total: number;
	lastPage: number;
	limit: number;
};

type QuestionState = {
	byChapter: Record<string, QuestionChapterState>;
	byId: Record<string, Question>;
};

function createQuestionStore() {
	const store = writable<QuestionState>({ byChapter: {}, byId: {} });

	return {
		subscribe: store.subscribe,
		getCachedById(id: string): Question | undefined {
			return get(store).byId[id];
		},
		setCachedById(id: string, question: Question) {
			store.update((s) => ({
				...s,
				byId: { ...s.byId, [id]: question }
			}));
		},
		setQuestionsPage(
			chapterId: string,
			page: number,
			questions: Question[],
			pagination?: { total: number; lastPage: number; limit: number },
			filters?: string
		) {
			const key = cacheKey(chapterId, filters);
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
					byChapter: { ...s.byChapter, [key]: next },
					byId: s.byId
				};
			});
		},
		getQuestionsForPage(chapterId: string, page: number, filters?: string): Question[] | undefined {
			return get(store).byChapter[cacheKey(chapterId, filters)]?.questionsByPage[page];
		},
		getPagination(chapterId: string, filters?: string): { total: number; lastPage: number; limit: number } | undefined {
			const ch = get(store).byChapter[cacheKey(chapterId, filters)];
			if (!ch) return undefined;
			return { total: ch.total, lastPage: ch.lastPage, limit: ch.limit };
		},
		hasPage(chapterId: string, page: number, filters?: string): boolean {
			return page in (get(store).byChapter[cacheKey(chapterId, filters)]?.questionsByPage ?? {});
		},
		clearChapter(chapterId: string, filters?: string) {
			store.update((s) => {
				const next = { ...s.byChapter };
				delete next[cacheKey(chapterId, filters)];
				return { byChapter: next, byId: s.byId };
			});
		},
		clear() {
			store.set({ byChapter: {}, byId: {} });
		}
	};
}

export const questionStore = createQuestionStore();
