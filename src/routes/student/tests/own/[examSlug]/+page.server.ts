import { fetchGroupedChaptersByExamSlug } from '$lib/api/chapters';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const { examSlug } = params;

  const response = await fetchGroupedChaptersByExamSlug(examSlug, fetch);

  if (!response.success) {
    return {
      examSlug,
      groupedSubjects: [],
      error: response.message || 'Failed to fetch chapters'
    };
  }

  const body = response.data;
  const groupedSubjects = body.data ?? [];

  return {
    examSlug,
    groupedSubjects,
    error: null
  };
};
