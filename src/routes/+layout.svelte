<script lang="ts">
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
  import { authStore } from '$lib/stores/auth';

  let { children } = $props();

  if (browser) {
    authStore.restoreToken();
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}