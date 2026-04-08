import { dev } from '$app/environment';
import { redirect, type Cookies, type RequestHandler } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

const clearCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	maxAge: 0
};

function clearAuthCookieAndRedirect(cookies: Cookies) {
	cookies.delete(AUTH_STORAGE_KEY, clearCookieOptions);
	throw redirect(302, '/');
}

export const GET: RequestHandler = async ({ cookies }) => {
	clearAuthCookieAndRedirect(cookies);
	return new Response(null, { status: 204 });
};

export const POST: RequestHandler = async ({ cookies }) => {
	clearAuthCookieAndRedirect(cookies);
	return new Response(null, { status: 204 });
};
