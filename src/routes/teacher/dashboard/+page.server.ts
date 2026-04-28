import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Exam } from '$lib/api/exams';
import { fetchExamsPage } from '$lib/api/exams';
import { STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import { fetchUserDashboard } from '$lib/api/userDashboard';

const DASHBOARD_EXAMS_PAGE = 1;

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
  if (!token?.trim()) {
    throw redirect(302, '/');
  }

  return {
    streamed: {
      exams: fetchExamsPage(DASHBOARD_EXAMS_PAGE, STUDENT_EXAMS_PAGE_SIZE, token, fetch)
        .then((res) => res.data)
        .catch(() => [] as Exam[]),
      dashboard: fetchUserDashboard({ token, fetch })
        .then((res) => (res.success && res.data?.success ? res.data.data : null))
        .catch(() => null)
    }
  };
};

