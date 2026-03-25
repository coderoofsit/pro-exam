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
 * Resolves the JWT for API calls: explicit override, then authStore, then localStorage
 * (store may not be hydrated yet — e.g. before layout onMount), then env TOKEN (SSR / dev).
 */
export function resolveApiToken(override?: string | null): string | undefined {
	const o = normalizeBearer(override);
	if (o) return o;
	if (browser) {
		const fromStore = normalizeBearer(get(authStore).token);
		if (fromStore) return fromStore;
		if (typeof localStorage !== 'undefined') {
			const fromLs = normalizeBearer(localStorage.getItem(AUTH_STORAGE_KEY));
			if (fromLs) return fromLs;
		}
	}
	return normalizeBearer(TOKEN);
}
