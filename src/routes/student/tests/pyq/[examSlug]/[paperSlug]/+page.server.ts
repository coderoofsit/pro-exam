import type { PageServerLoad } from './$types';
import { getPaperQuestionsByPaperId, getPapersByExamSlug } from '$lib/api/paper';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';

export const load: PageServerLoad = async ({ params, fetch, url, cookies }) => {
  const examSlug = (params.examSlug ?? '').trim();
  const paperSlug = (params.paperSlug ?? '').trim();
  const subjectSlug = url.searchParams.get('subject') || undefined;

  const token = getAuthTokenFromCookies(cookies) ?? null;
  const questionsPromise = getPaperQuestionsByPaperId(paperSlug, fetch, subjectSlug);
  const papersResponsePromise = getPapersByExamSlug(examSlug, fetch, token);

  return {
    examSlug,
    paperSlug,
    subjectSlug,
    streamed: {
      questionsPromise,
      paperDetailsPromise: papersResponsePromise.then(res => {
        if (!res.success) return null;
        const groups = (res.data.data ?? []) as any[];
        for (const g of groups) {
          const found = (g.papers ?? []).find((p: any) => p._id === paperSlug || p.slug === paperSlug);
          if (found) {
             // populate testAttemptedId like in the list page
             const testAttemptedId = String(found.testAttemptedId || found.testAttemptId || found.attemptId || '').trim();
             return { ...found, testAttemptedId };
          }
        }
        return null;
      })
    }
  };
};
