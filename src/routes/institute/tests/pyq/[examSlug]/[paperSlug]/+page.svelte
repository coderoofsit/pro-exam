<script lang="ts">
  import StudentPyqPaperPage from '../../../../../../../student/tests/pyq/[examSlug]/[paperSlug]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentPyqPaperPage {data} />
