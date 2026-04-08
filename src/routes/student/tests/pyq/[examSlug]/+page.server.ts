import { getPapersByExamSlug } from '$lib/api/paper';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
  const { examSlug } = params;
  const token = getAuthTokenFromCookies(cookies) ?? null;

  const response = await getPapersByExamSlug(examSlug, fetch, token);

  if (!response.success) {
    return {
      examSlug,
      papersByYear: [],
      error: response.message || 'Failed to fetch papers'
    };
  }

  const rawGroups = (response.data.data ?? []) as Array<{ year?: number; papers?: Array<Record<string, unknown>> }>;
  const papersByYear = rawGroups.map((group) => ({
    year: Number(group?.year ?? 0),
    papers: (group?.papers ?? []).map((paper) => {
      const testAttemptedId =
        String(
          paper?.testAttemptedId ??
          paper?.testAttemptId ??
          paper?.attemptId ??
          ''
        ).trim();
      return {
        ...paper,
        testAttemptedId
      };
    })
  }));

  return {
    examSlug,
    papersByYear,
    error: null,
    message: response.data.message
  };
};