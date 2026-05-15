<script lang="ts">
	import StudentTestViewPage from '../../../../student/tests/view/[testId]/+page.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<StudentTestViewPage {data} />
