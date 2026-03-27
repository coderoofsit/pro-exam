<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();

  afterNavigate(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('layout-main-scroll')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
</script>

<Sidebar role="student">
  {@render children()}
</Sidebar>
