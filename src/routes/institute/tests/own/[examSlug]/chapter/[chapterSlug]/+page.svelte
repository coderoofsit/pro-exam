<script lang="ts">
  import StudentOwnChapterPage from '../../../../../../../student/tests/own/[examSlug]/chapter/[chapterSlug]/+page.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<StudentOwnChapterPage {data} />
