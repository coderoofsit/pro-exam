<script lang="ts">
  import StudentBatchDetailPage from '../../../student/batch/[batchSlug]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentBatchDetailPage {data} />
