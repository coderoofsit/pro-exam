import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { TOKEN } from '$lib/http';
import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';

function normalizeBearer(raw: string | null | undefined): string | undefined {
	if (!raw) return undefined;
	const s = raw.trim();
	if (!s) return undefined;
	return s.startsWith('Bearer ') ? s.slice(7) : s;
}

/**
 * Resolves the JWT for API calls.
 * - Explicit `override` wins.
 * - In the **browser**, uses **localStorage** (canonical session) first, then authStore.
 *   Does **not** use the dev `TOKEN` env on the client so requests only carry the logged-in user’s token.
 * - On the **server**, falls back to env `TOKEN` only when needed for SSR tools (callers can pass `skipAuth` to avoid any token).
 */
export function resolveApiToken(override?: string | null): string | undefined {
	const o = normalizeBearer(override);
	if (o) return o;
	if (browser) {
		if (typeof localStorage !== 'undefined') {
			const fromLs = normalizeBearer(localStorage.getItem(AUTH_STORAGE_KEY));
			if (fromLs) return fromLs;
		}
		if (typeof document !== 'undefined' && typeof document.cookie === 'string') {
			const m = document.cookie.match(
				new RegExp(`(?:^|;\\s*)${AUTH_STORAGE_KEY.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}=([^;]*)`)
			);
			const fromCookie = normalizeBearer(m ? decodeURIComponent(m[1]) : null);
			if (fromCookie) return fromCookie;
		}
		const fromStore = normalizeBearer(get(authStore).token);
		if (fromStore) return fromStore;
		return undefined;
	}
	return normalizeBearer(TOKEN);
}
