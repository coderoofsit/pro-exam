<script lang="ts">
  import StudentExamSubjectPage from '../../../../../student/exams/[examSlug]/subject/+page.svelte';

  let { data } = $props();
</script>

<StudentExamSubjectPage {data} basePath="/institute/exams" />
