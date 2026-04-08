import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

const PROTECTED_PREFIXES = ['/student/dashboard'];

function isProtectedPath(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(AUTH_STORAGE_KEY) ?? null;
	const isAuthenticated = Boolean(token && token.trim().length > 0);
	const { pathname } = event.url;

	event.locals.authToken = token;

	if (isAuthenticated && (pathname === '/' || pathname === '/login')) {
		throw redirect(302, '/student/dashboard');
	}

	if (!isAuthenticated && isProtectedPath(pathname)) {
		throw redirect(302, '/');
	}

	const response = await resolve(event);

	if (!dev) {
		response.headers.set('cache-control', 'no-store');
	}

	return response;
};
