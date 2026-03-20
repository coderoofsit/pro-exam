import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';

export async function requireAuth() {
  let auth = get(authStore);

  if (auth.token) {
    return true;
  }

  authStore.restoreToken();
  auth = get(authStore);

  if (!auth.token) {
    await goto('/login');
    return false;
  }

  return true;
}