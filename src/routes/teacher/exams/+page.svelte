<script lang="ts">
  import StudentExamsPage from '../../student/exams/+page.svelte';

  let { data } = $props();
</script>

<StudentExamsPage {data} basePath="/teacher/exams" />
