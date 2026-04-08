import { redirect } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;

	if (token?.trim()) {
		throw redirect(302, '/student/dashboard');
	}

	return {};
};
