<script lang="ts">
	import TestQuestionsPage from '../../pyq/[examSlug]/[paperSlug]/+page.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<TestQuestionsPage {data} isReadOnly={true} />
