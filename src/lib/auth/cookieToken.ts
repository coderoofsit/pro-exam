import type { Cookies } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

/** JWT from the mirrored session cookie (same key as `localStorage` / `auth_token`). */
export function getAuthTokenFromCookies(cookies: Cookies): string | undefined {
	const raw = cookies.get(AUTH_STORAGE_KEY);
	if (!raw?.trim()) return undefined;
	try {
		return decodeURIComponent(raw.trim());
	} catch {
		return raw.trim();
	}
}
