<script lang="ts">
    import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { authStore } from '$lib/stores/auth';

    
	let { children } = $props();
	onMount(() => {
    authStore.restore();
  });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
