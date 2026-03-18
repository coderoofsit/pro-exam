<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { children } = $props();
</script>

<div class="min-h-screen flex bg-surface-page">
  <Sidebar role="student" />

  <main class="flex-1 p-6">
    {@render children()}
  </main>
</div>