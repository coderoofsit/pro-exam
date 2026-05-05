import type { PageServerLoad } from './$types';
import { getPaperQuestionsByPaperId } from '$lib/api/paper';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
  const examSlug = (params.examSlug ?? '').trim();
  const paperSlug = (params.paperSlug ?? '').trim();
  const subjectSlug = url.searchParams.get('subject') || undefined;

  if (!paperSlug) {
    return {
      examSlug,
      paperSlug,
      streamed: {
        questionsPromise: Promise.resolve({
          success: false,
          data: { sections: [], questions: [] },
          message: 'Paper id is missing.'
        })
      }
    };
  }

  // Do NOT await the promise so SSR completes instantly
  const questionsPromise = getPaperQuestionsByPaperId(paperSlug, fetch, subjectSlug);

  return {
    examSlug,
    paperSlug,
    subjectSlug,
    streamed: {
      questionsPromise
    }
  };
};
