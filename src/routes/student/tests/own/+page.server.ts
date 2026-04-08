import { fetchExamsPage } from '$lib/api/exams';
import { OWN_TESTS_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
  try {
    const res = await fetchExamsPage(1, OWN_TESTS_EXAMS_PAGE_SIZE, token, fetch);
    return {
      exams: res.data,
      error: null
    };
  } catch (e) {
    return {
      exams: [],
      error: e instanceof Error ? e.message : 'Failed to fetch exams'
    };
  }
};
