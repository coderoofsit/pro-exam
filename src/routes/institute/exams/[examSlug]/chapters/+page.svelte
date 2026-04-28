<script lang="ts">
  import StudentExamChaptersPage from '../../../../../student/exams/[examSlug]/chapters/+page.svelte';

  let { data } = $props();
</script>

<StudentExamChaptersPage {data} basePath="/institute/exams" />
