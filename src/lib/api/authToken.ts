import { browser } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { getAuthTokenFromDocumentCookie } from '$lib/auth/clientCookieToken';
import { AUTH_OWNED_BY_KEY, AUTH_OWNED_ROLE_KEY, getPersistedOwnedContext } from '$lib/stores/auth';
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

	return normalizeBearer(getAuthTokenFromDocumentCookie());
}

export function setApiToken(token: string): void {
	void token;
}

export function clearApiToken(): void {
	if (!browser) return;
}

export type OwnedQueryContext = {
	ownedBy?: string | null;
	ownedRole?: string | null;
};

/** Resolve `ownedBy` / `ownedRole` from auth store (browser), localStorage, or httpOnly cookies (SSR). */
export function resolveOwnedContext(): OwnedQueryContext {
	if (browser) {
		const state = get(authStore);
		const fromStore = {
			ownedBy: state.ownedBy?.trim() || null,
			ownedRole: state.ownedRole?.trim() || null
		};
		if (fromStore.ownedBy || fromStore.ownedRole) return fromStore;
		return getPersistedOwnedContext();
	}

	try {
		const { cookies } = getRequestEvent();
		return {
			ownedBy: cookies.get(AUTH_OWNED_BY_KEY)?.trim() || null,
			ownedRole: cookies.get(AUTH_OWNED_ROLE_KEY)?.trim() || null
		};
	} catch {
		return { ownedBy: null, ownedRole: null };
	}
}

/** Append `ownedBy` / `ownedRole` query params for every API call (GET, POST, etc.). */
export function withOwnedQuery(endpoint: string, ctx?: OwnedQueryContext): string {
	const { ownedBy, ownedRole } = ctx ?? resolveOwnedContext();
	const ob = ownedBy?.trim();
	const or = ownedRole?.trim();
	if (!ob && !or) return endpoint;

	const qIndex = endpoint.indexOf('?');
	const path = qIndex === -1 ? endpoint : endpoint.slice(0, qIndex);
	const qs = new URLSearchParams(qIndex === -1 ? '' : endpoint.slice(qIndex + 1));
	if (ob) qs.set('ownedBy', ob);
	if (or) qs.set('ownedRole', or);
	const q = qs.toString();
	return q ? `${path}?${q}` : path;
}
