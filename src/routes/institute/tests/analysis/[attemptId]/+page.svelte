<script lang="ts">
  import StudentAnalysisPage from '../../../../student/tests/analysis/[attemptId]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentAnalysisPage {data} />
