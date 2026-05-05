/**
 * In-memory cache for `/student/tests` disabled.
 */

export function testsPageCacheKey(url: URL, token: string | null): string {
	return 'disabled';
}

export function getTestsPageCache(key: string): unknown | null {
	return null;
}

export function setTestsPageCache(key: string, data: unknown): void {
	// Cache disabled to ensure fresh data
}
