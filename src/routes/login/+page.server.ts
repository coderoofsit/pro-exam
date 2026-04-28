import { redirect } from '@sveltejs/kit';
import { AUTH_ROLE_STORAGE_KEY, AUTH_STORAGE_KEY } from '$lib/stores/auth';
import type { PageServerLoad } from './$types';

function roleDashboardPath(roleValue: string | null | undefined): string {
	const role = (roleValue ?? '').trim().toLowerCase();
	if (role === 'tutor' || role === 'teacher') return '/teacher/dashboard';
	if (role === 'institute') return '/institute/dashboard';
	return '/student/dashboard';
}

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	const role = cookies.get(AUTH_ROLE_STORAGE_KEY) ?? null;

	if (token?.trim()) {
		throw redirect(302, roleDashboardPath(role));
	}

	return {};
};
