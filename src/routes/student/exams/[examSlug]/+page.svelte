<script lang="ts">
	import ExamSlugPage from '../../../exams/[examSlug]/+page.svelte';

	const props = $props();
</script>

<ExamSlugPage {...props} />
