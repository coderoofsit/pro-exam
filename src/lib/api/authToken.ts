import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth';

function normalizeBearer(raw: string | null | undefined): string | undefined {
	if (!raw) return undefined;

	const value = raw.trim();
	if (!value) return undefined;

	return value.startsWith('Bearer ') ? value.slice(7) : value;
}

/** Browser token resolver (override -> in-memory store). */
export function resolveApiToken(override?: string | null): string | undefined {
	const overrideToken = normalizeBearer(override);
	if (overrideToken) return overrideToken;

	if (!browser) return undefined;

	const storeToken = normalizeBearer(get(authStore).token);
	if (storeToken) return storeToken;

	return undefined;
}

export function setApiToken(token: string): void {
	void token;
}

export function clearApiToken(): void {
	if (!browser) return;
	// token is now cleared by auth store clear/logout and server logout endpoint
}