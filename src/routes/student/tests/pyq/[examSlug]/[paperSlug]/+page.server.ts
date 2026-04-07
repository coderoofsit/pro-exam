import type { PageServerLoad } from './$types';
import { getPaperQuestionsByPaperId } from '$lib/api/paper';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const examSlug = (params.examSlug ?? '').trim();
  const paperSlug = (params.paperSlug ?? '').trim();

  if (!paperSlug) {
    return {
      examSlug,
      paperSlug,
      questions: [],
      error: 'Paper id is missing.'
    };
  }

  const res = await getPaperQuestionsByPaperId(paperSlug, fetch);
  if (!res.success) {
    return {
      examSlug,
      paperSlug,
      questions: [],
      error: res.message || 'Failed to fetch paper questions.'
    };
  }

  return {
    examSlug,
    paperSlug,
    questions: res.data?.data ?? [],
    error: null as string | null
  };
};
