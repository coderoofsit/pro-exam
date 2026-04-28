import { dev } from '$app/environment';
import { json, type RequestHandler } from '@sveltejs/kit';
import { AUTH_ROLE_STORAGE_KEY, AUTH_STORAGE_KEY, FCM_TOKEN_STORAGE_KEY } from '$lib/stores/auth';

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const authCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as
		| { token?: string | null; fcmToken?: string | null; role?: string | null }
		| null;
	const token = (body?.token ?? '').trim();
	const fcmToken = (body?.fcmToken ?? '').trim();
	const role = (body?.role ?? '').trim();

	if (!token) {
		return json({ success: false, message: 'Token is required.' }, { status: 400 });
	}

	cookies.set(AUTH_STORAGE_KEY, token, authCookieOptions);
	if (role) {
		cookies.set(AUTH_ROLE_STORAGE_KEY, role, authCookieOptions);
	} else {
		cookies.delete(AUTH_ROLE_STORAGE_KEY, { ...authCookieOptions, maxAge: 0 });
	}
	if (fcmToken) {
		cookies.set(FCM_TOKEN_STORAGE_KEY, fcmToken, authCookieOptions);
	} else {
		cookies.delete(FCM_TOKEN_STORAGE_KEY, { ...authCookieOptions, maxAge: 0 });
	}
	return json({ success: true });
};
