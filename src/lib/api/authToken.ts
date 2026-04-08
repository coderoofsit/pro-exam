import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';

function normalizeBearer(raw: string | null | undefined): string | undefined {
	if (!raw) return undefined;

	const value = raw.trim();
	if (!value) return undefined;

	return value.startsWith('Bearer ') ? value.slice(7) : value;
}

function getCookieValue(name: string): string | undefined {
	if (!browser || typeof document === 'undefined') return undefined;

	const escapedKey = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapedKey}=([^;]*)`));

	return match ? decodeURIComponent(match[1]) : undefined;
}

/** Browser token resolver (override -> cookie -> store). */
export function resolveApiToken(override?: string | null): string | undefined {
	const overrideToken = normalizeBearer(override);
	if (overrideToken) return overrideToken;

	if (!browser) return undefined;

	const cookieToken = normalizeBearer(getCookieValue(AUTH_STORAGE_KEY));
	if (cookieToken) return cookieToken;

	const storeToken = normalizeBearer(get(authStore).token);
	if (storeToken) return storeToken;

	return undefined;
}

export function setApiToken(token: string): void {
	if (!browser) return;

	const normalized = normalizeBearer(token);
	if (!normalized) return;

	document.cookie = [
		`${AUTH_STORAGE_KEY}=${encodeURIComponent(normalized)}`,
		'Path=/',
		'Max-Age=2592000',
		'SameSite=Lax'
	].join('; ');
}

export function clearApiToken(): void {
	if (!browser) return;

	document.cookie = [
		`${AUTH_STORAGE_KEY}=`,
		'Path=/',
		'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
		'SameSite=Lax'
	].join('; ');
}