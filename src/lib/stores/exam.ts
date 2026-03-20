import { writable, get } from 'svelte/store';
import type { Exam } from '$lib/api/exams';

type ExamState = {
	examsByPage: Record<number, Exam[]>;
	total: number;
	lastPage: number;
	limit: number;
};

function createExamStore() {
	const store = writable<ExamState>({
		examsByPage: {},
		total: 0,
		lastPage: 0,
		limit: 8
	});

	return {
		subscribe: store.subscribe,
		setExamsPage(page: number, exams: Exam[], pagination?: { total: number; lastPage: number; limit: number }) {
			store.update((s) => {
				const next = {
					...s,
					examsByPage: { ...s.examsByPage, [page]: exams }
				};
				if (pagination) {
					next.total = pagination.total;
					next.lastPage = pagination.lastPage;
					next.limit = pagination.limit;
				}
				return next;
			});
		},
		setPagination(total: number, lastPage: number, limit: number) {
			store.update((s) => ({ ...s, total, lastPage, limit }));
		},
		getExamsForPage(page: number): Exam[] | undefined {
			return get(store).examsByPage[page];
		},
		hasPage(page: number): boolean {
			return page in get(store).examsByPage;
		},
		getExamBySlug(slug: string): Exam | undefined {
			const state = get(store);
			for (const exams of Object.values(state.examsByPage)) {
				const found = exams.find((e) => e.slug === slug);
				if (found) return found;
			}
			return undefined;
		},
		clear() {
			store.set({ examsByPage: {}, total: 0, lastPage: 0, limit: 8 });
		}
	};
}

export const examStore = createExamStore();
