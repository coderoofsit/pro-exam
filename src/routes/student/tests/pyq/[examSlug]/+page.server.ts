import { getPapersByExamSlug } from '$lib/api/paper';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { examSlug } = params;

  const response = await getPapersByExamSlug(examSlug, fetch);

  if (!response.success) {
    return {
      examSlug,
      papersByYear: [],
      error: response.message || 'Failed to fetch papers'
    };
  }

  return {
    examSlug,
    papersByYear: response.data.data ?? [],
    error: null,
    message: response.data.message
  };
};