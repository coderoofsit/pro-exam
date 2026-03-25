import { getExamsForPapers } from '$lib/api/exams';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const response = await getExamsForPapers(fetch);

  if (!response.success) {
    return {
      exams: [],
      error: response.message || 'Failed to fetch exams'
    };
  }

  return {
    exams: response.data?.data ?? [],
    error: null
  };
};
