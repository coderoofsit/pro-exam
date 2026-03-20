import type { PageServerLoad } from './$types';
import { getExamsServer } from '$lib/api/exams';

export const load: PageServerLoad = async ({ fetch }) => {
  const { exams, message } = await getExamsServer(fetch);

  return {
    exams,
    message
  };
};