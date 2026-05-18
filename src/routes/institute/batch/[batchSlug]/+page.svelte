<script lang="ts">
	import TeacherBatchDetailPage from '../../../teacher/batch/[batchSlug]/+page.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<TeacherBatchDetailPage {data} />
