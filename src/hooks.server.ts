import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { AUTH_ROLE_STORAGE_KEY, AUTH_STORAGE_KEY } from '$lib/stores/auth';

const PROTECTED_PREFIXES = ['/student', '/teacher', '/institute'];

type AccountRole = 'student' | 'tutor' | 'institute';

function normalizeAccountRole(value: string | null | undefined): AccountRole | null {
	const role = (value ?? '').trim().toLowerCase();
	if (role === 'student') return 'student';
	if (role === 'tutor' || role === 'teacher') return 'tutor';
	if (role === 'institute') return 'institute';
	return null;
}

function roleDashboardPath(role: AccountRole): string {
	if (role === 'tutor') return '/teacher/dashboard';
	if (role === 'institute') return '/institute/dashboard';
	return '/student/dashboard';
}

function readRoleFromToken(token: string | null): AccountRole | null {
	if (!token) return null;
	const trimmed = token.trim();
	if (!trimmed) return null;
	const parts = trimmed.split('.');
	if (parts.length < 2) return null;
	try {
		const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
		const payload = JSON.parse(payloadJson) as { role?: string | null } | null;
		return normalizeAccountRole(payload?.role);
	} catch {
		return null;
	}
}

function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** First-time Google sign-in returns no JWT until membership exists — allow onboarding without session cookie. */
function allowsUnauthenticatedOnboarding(pathname: string): boolean {
	const p = pathname.replace(/\/+$/, '') || '/';
	return (
		p === '/student/profile/create' ||
		p === '/teacher/profile/create' ||
		p === '/institute/profile/create' ||
		p === '/institute/profile'
	);
}

function rolePrefix(role: AccountRole): '/student' | '/teacher' | '/institute' {
	if (role === 'tutor') return '/teacher';
	if (role === 'institute') return '/institute';
	return '/student';
}

function isRoleNamespace(pathname: string): boolean {
	return pathname.startsWith('/student') || pathname.startsWith('/teacher') || pathname.startsWith('/institute');
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(AUTH_STORAGE_KEY) ?? null;
	const isAuthenticated = Boolean(token && token.trim().length > 0);
	const roleCookie = event.cookies.get(AUTH_ROLE_STORAGE_KEY) ?? null;
	const role = normalizeAccountRole(roleCookie) ?? readRoleFromToken(token) ?? 'student';
	const { pathname } = event.url;

	event.locals.authToken = token;

	if (isAuthenticated && (pathname === '/' || pathname === '/login')) {
		throw redirect(302, roleDashboardPath(role));
	}

	if (!isAuthenticated && isProtectedPath(pathname) && !allowsUnauthenticatedOnboarding(pathname)) {
		throw redirect(302, '/');
	}

	if (isAuthenticated && isRoleNamespace(pathname)) {
		const allowedPrefix = rolePrefix(role);
		if (!pathname.startsWith(allowedPrefix)) {
			throw redirect(302, roleDashboardPath(role));
		}
	}

	const response = await resolve(event);

	if (!dev) {
		response.headers.set('cache-control', 'no-store');
	}

	return response;
};
