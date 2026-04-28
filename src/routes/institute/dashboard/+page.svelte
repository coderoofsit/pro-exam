<script lang="ts">
  import StudentDashboardPage from '../../student/dashboard/+page.svelte';
  import AddStudentsUploadSection from '$lib/components/AddStudentsUploadSection.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Institute Dashboard</title>
</svelte:head>

<StudentDashboardPage data={{ streamed: { exams: data.streamed.exams } }} basePath="/institute" dashboard={data.streamed.dashboard} />
<AddStudentsUploadSection />