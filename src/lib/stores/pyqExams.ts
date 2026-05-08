import { get, writable } from 'svelte/store';
import { getExamsForPapers, type Exam, type ExamForPaperItem } from '$lib/api/exams';

type PyqExamsState = {
  exams: Exam[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: number | null;
};

const CACHE_KEY = 'pyq_exams_cache_v1';
const CACHE_TTL_MS = 30 * 60 * 1000;

const initialState: PyqExamsState = {
  exams: [],
  loading: false,
  loaded: false,
  error: null,
  lastFetchedAt: null
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function readCache(): { exams: Exam[]; lastFetchedAt: number } | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { exams?: Exam[]; lastFetchedAt?: number };
    if (!Array.isArray(parsed.exams) || typeof parsed.lastFetchedAt !== 'number') return null;
    if (Date.now() - parsed.lastFetchedAt > CACHE_TTL_MS) return null;
    return { exams: parsed.exams, lastFetchedAt: parsed.lastFetchedAt };
  } catch {
    return null;
  }
}

function writeCache(exams: Exam[], lastFetchedAt: number) {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ exams, lastFetchedAt }));
  } catch {
    // Ignore storage errors.
  }
}

function createPyqExamsStore() {
  const cache = readCache();
  const store = writable<PyqExamsState>(
    cache
      ? {
          exams: cache.exams,
          loading: false,
          loaded: true,
          error: null,
          lastFetchedAt: cache.lastFetchedAt
        }
      : initialState
  );

  let inFlight: Promise<void> | null = null;

  function toExam(item: ExamForPaperItem): Exam {
    return {
      _id: item._id,
      slug: item.slug ?? '',
      boardSlug: '',
      name: {
        en: item.name?.en ?? 'Unnamed Exam',
        hi: item.name?.hi
      },
      image: item.image ?? null
    };
  }

  async function load(force = false) {
    const current = get(store);
    if (!force && current.loaded) return;
    if (inFlight) return inFlight;

    store.update((s) => ({ ...s, loading: true, error: null }));

    inFlight = (async () => {
      const response = await getExamsForPapers();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch exams');
      }

      const exams = (response.data?.data ?? []).map(toExam);
      const lastFetchedAt = Date.now();
      store.set({
        exams,
        loading: false,
        loaded: true,
        error: null,
        lastFetchedAt
      });
      writeCache(exams, lastFetchedAt);
    })()
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to fetch exams';
        store.update((s) => ({ ...s, loading: false, error: message }));
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  return {
    subscribe: store.subscribe,
    load,
    refresh: () => load(true)
  };
}

export const pyqExamsStore = createPyqExamsStore();
