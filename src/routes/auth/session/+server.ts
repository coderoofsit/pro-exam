import { dev } from '$app/environment';
import { json, type RequestHandler } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const authCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as { token?: string | null } | null;
	const token = (body?.token ?? '').trim();

	if (!token) {
		return json({ success: false, message: 'Token is required.' }, { status: 400 });
	}

	cookies.set(AUTH_STORAGE_KEY, token, authCookieOptions);
	return json({ success: true });
};
