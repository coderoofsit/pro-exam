/**
 * In-memory cache for `/student/tests` only. Browser-only; 60s TTL per URL + auth stamp.
 */

const TTL_MS = 60_000;

const entries = new Map<string, { data: unknown; ts: number }>();

function simpleHash(s: string): string {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
	return String(h);
}

/** Stable key: pathname + search + auth identity so login/logout does not reuse wrong payload. */
export function testsPageCacheKey(url: URL, token: string | null): string {
	const stamp = token ? `u:${simpleHash(token)}` : 'u:guest';
	return `${url.pathname}${url.search}::${stamp}`;
}

export function getTestsPageCache(key: string): unknown | null {
	const e = entries.get(key);
	if (!e) return null;
	if (Date.now() - e.ts > TTL_MS) {
		entries.delete(key);
		return null;
	}
	return e.data;
}

export function setTestsPageCache(key: string, data: unknown): void {
	entries.set(key, { data, ts: Date.now() });
}
