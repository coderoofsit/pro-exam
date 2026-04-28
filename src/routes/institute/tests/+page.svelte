<script lang="ts">
  import StudentTestsPage from '../../student/tests/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentTestsPage {data} basePath="/institute" />
