<script lang="ts">
  import StudentPyqExamPage from '../../../../student/tests/pyq/[examSlug]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentPyqExamPage {data} />
