<script lang="ts">
  import StudentExamQuestionsPage from '../../../../../../../student/exams/[examSlug]/subject/[subjectSlug]/questions/[chapterParam]/+page.svelte';

  let { data } = $props();
</script>

<StudentExamQuestionsPage {data} basePath="/teacher/exams" />
