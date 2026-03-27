import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { applyTheme, getStoredTheme, type ThemeMode } from '$lib/theme';

function createThemeStore() {
  const initial: ThemeMode = browser ? getStoredTheme() : 'dark';

  const { subscribe, set, update } = writable<ThemeMode>(initial);

  if (browser) applyTheme(initial);

  return {
    subscribe,
    toggle() {
      update((t) => {
        const next: ThemeMode = t === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return next;
      });
    },
    set(theme: ThemeMode) {
      applyTheme(theme);
      set(theme);
    }
  };
}

export const themeStore = createThemeStore();
