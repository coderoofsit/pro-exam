import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

function createThemeStore() {
  const stored = browser ? (localStorage.getItem('theme') as Theme | null) : null;
  const initial: Theme = stored ?? 'dark';

  const { subscribe, set, update } = writable<Theme>(initial);

  function apply(theme: Theme) {
    if (!browser) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  if (browser) apply(initial);

  return {
    subscribe,
    toggle() {
      update(t => {
        const next: Theme = t === 'dark' ? 'light' : 'dark';
        apply(next);
        return next;
      });
    },
    set(theme: Theme) {
      apply(theme);
      set(theme);
    }
  };
}

export const themeStore = createThemeStore();