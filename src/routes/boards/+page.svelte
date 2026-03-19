<script lang="ts">
	import Board from '$lib/components/Board.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Boards</title>
</svelte:head>

<Board boards={data.boards} />
