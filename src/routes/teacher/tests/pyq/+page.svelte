<script lang="ts">
  import StudentPyqPage from '../../../student/tests/pyq/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentPyqPage {data} basePath="/teacher/tests/pyq" />
