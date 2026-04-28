<script lang="ts">
  import StudentOwnExamPage from '../../../../../student/tests/own/[examSlug]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentOwnExamPage {data} />
