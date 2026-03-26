import { writable, get } from 'svelte/store';
import type { Exam } from '$lib/api/exams';

/** Page size for `/student/exams` and dashboard page-1 fetch — keeps a single cache entry for both routes. */
export const STUDENT_EXAMS_PAGE_SIZE = 18;

/** Page size for `/student/tests/own` page-1 fetch. */
export const OWN_TESTS_EXAMS_PAGE_SIZE = 50;

type ExamState = {
	examsByPage: Record<number, Exam[]>;
	/** Page size used when each page was last fetched (avoids mixing dashboard vs all-exams caches). */
	limitByPage: Record<number, number>;
	total: number;
	lastPage: number;
	limit: number;
	/** Exams not on the paginated list (e.g. from fetchExamBySlug) — enables getExamBySlug without refetch. */
	examsBySlug: Record<string, Exam>;
};

function createExamStore() {
	const store = writable<ExamState>({
		examsByPage: {},
		limitByPage: {},
		total: 0,
		lastPage: 0,
		limit: 8,
		examsBySlug: {}
	});

	return {
		subscribe: store.subscribe,
		setExamsPage(page: number, exams: Exam[], pagination?: { total: number; lastPage: number; limit: number }) {
			store.update((s) => {
				const nextBySlug = { ...s.examsBySlug };
				for (const e of exams) {
					// `Exam` typing currently doesn't include `slug`, but runtime exam objects do.
					const slug = (e as any).slug as string | undefined;
					if (!slug) continue;
					nextBySlug[slug] = e;
				}
				const next: ExamState = {
					...s,
					examsByPage: { ...s.examsByPage, [page]: exams },
					examsBySlug: nextBySlug
				};
				if (pagination) {
					next.total = pagination.total;
					next.lastPage = pagination.lastPage;
					next.limit = pagination.limit;
					next.limitByPage = { ...s.limitByPage, [page]: pagination.limit };
				}
				return next;
			});
		},
		/** Store a single exam (e.g. after fetchExamBySlug) so getExamBySlug works without list pagination. */
		setExamBySlug(exam: Exam) {
			const slug = (exam as any).slug as string | undefined;
			if (!slug) return;
			store.update((s) => ({
				...s,
				examsBySlug: { ...s.examsBySlug, [slug]: exam }
			}));
		},
		setPagination(total: number, lastPage: number, limit: number) {
			store.update((s) => ({ ...s, total, lastPage, limit }));
		},
		getExamsForPage(page: number): Exam[] | undefined {
			return get(store).examsByPage[page];
		},
		/**
		 * True if this page is cached. When expectedPageSize is set, the cache is valid if we
		 * fetched with a page size >= that (e.g. exams list uses 18/page; dashboard needs 7 from page 1 — one fetch serves both).
		 */
		hasPage(page: number, expectedPageSize?: number): boolean {
			const s = get(store);
			if (!(page in s.examsByPage)) return false;
			if (expectedPageSize == null) return true;
			const stored = s.limitByPage[page];
			if (stored == null) return false;
			return stored >= expectedPageSize;
		},
		getExamBySlug(slug: string): Exam | undefined {
			const state = get(store);
			const direct = state.examsBySlug[slug];
			if (direct) return direct;
			for (const exams of Object.values(state.examsByPage)) {
				const found = exams.find((e) => (e as any).slug === slug);
				if (found) return found;
			}
			return undefined;
		},
		clear() {
			store.set({ examsByPage: {}, limitByPage: {}, total: 0, lastPage: 0, limit: 8, examsBySlug: {} });
		}
	};
}

export const examStore = createExamStore();
