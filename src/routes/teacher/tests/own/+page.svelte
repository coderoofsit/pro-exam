<script lang="ts">
  import StudentOwnTestsPage from '../../../student/tests/own/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentOwnTestsPage {data} basePath="/teacher" />
