import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const examSlug = url.searchParams.get('examSlug') ?? 'neet';

	// Keep backward compatibility: old URL `/student/custom?examSlug=...`
	// will now show the same panel at `/student-exam/{examSlug}`.
	throw redirect(303, `/student-exam/${encodeURIComponent(examSlug)}`);
};

