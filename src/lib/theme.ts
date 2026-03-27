export const THEME_STORAGE_KEY = 'examflow-theme';

export type ThemeMode = 'light' | 'dark';

export function getStoredTheme(): ThemeMode {
	if (typeof sessionStorage === 'undefined') return 'dark';
	const v = sessionStorage.getItem(THEME_STORAGE_KEY);
	return v === 'light' || v === 'dark' ? v : 'dark';
}

export function applyTheme(mode: ThemeMode): void {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = mode;
	try {
		sessionStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		/* ignore */
	}
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
	const next = current === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	return next;
}
