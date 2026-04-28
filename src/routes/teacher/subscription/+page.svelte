<script lang="ts">
  import StudentSubscriptionPage from '../../student/subscription/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentSubscriptionPage {data} />
