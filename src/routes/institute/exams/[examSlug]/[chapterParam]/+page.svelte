<script lang="ts">
	import ChapterPage from '../../../../exams/[examSlug]/[chapterParam]/+page.svelte';

	const props = $props();
</script>

<ChapterPage {...props} />
