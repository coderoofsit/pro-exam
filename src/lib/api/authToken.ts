import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { TOKEN } from '$lib/http';
import { authStore } from '$lib/stores/auth';

function normalizeBearer(raw: string | null | undefined): string | undefined {
	if (!raw) return undefined;
	const s = raw.trim();
	if (!s) return undefined;
	return s.startsWith('Bearer ') ? s.slice(7) : s;
}

/**
 * Resolves the JWT for API calls: authStore in the browser, else static TOKEN fallback (SSR / dev).
 * Optional override is used when callers pass an explicit token (tests / server).
 */
export function resolveApiToken(override?: string | null): string | undefined {
	const o = normalizeBearer(override);
	if (o) return o;
	if (browser) {
		const fromStore = normalizeBearer(get(authStore).token);
		if (fromStore) return fromStore;
	}
	return normalizeBearer(TOKEN);
}
