<script lang="ts">
	import ExamSlugPage from '../../../exams/[examSlug]/+page.svelte';

	let { data } = $props();
</script>

<ExamSlugPage {data} />
