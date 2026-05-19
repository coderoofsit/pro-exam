import { browser } from '$app/environment';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

/** Read mirrored session JWT from `document.cookie` (available before auth store hydrates). */
export function getAuthTokenFromDocumentCookie(): string | undefined {
	if (!browser) return undefined;

	const prefix = `${AUTH_STORAGE_KEY}=`;
	const match = document.cookie
		.split('; ')
		.find((row) => row.startsWith(prefix));
	if (!match) return undefined;

	const raw = match.slice(prefix.length);
	if (!raw) return undefined;

	try {
		return decodeURIComponent(raw.trim());
	} catch {
		return raw.trim();
	}
}
