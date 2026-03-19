<script lang="ts">
	import type { PageData } from './$types';
	import Exam from '$lib/components/Exam.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.board.name.en} Exams</title>
</svelte:head>

<Exam exams={data.exams} boardName={data.board.name.en} />
