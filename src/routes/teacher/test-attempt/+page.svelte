<script lang="ts">
  import StudentTestAttemptPage from '../../student/test-attempt/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentTestAttemptPage {data} />
