<script lang="ts">
  import StudentExamSubjectDetailPage from '../../../../../student/exams/[examSlug]/subject/[subjectSlug]/+page.svelte';

  let { data } = $props();
</script>

<StudentExamSubjectDetailPage {data} basePath="/teacher/exams" />
