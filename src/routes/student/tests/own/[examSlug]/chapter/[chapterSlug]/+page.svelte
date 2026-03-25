<script lang="ts">
  import { page } from '$app/state';

  const examSlug = $derived(page.params.examSlug ?? '');
  const chapterSlug = $derived(page.params.chapterSlug ?? '');
  const title = $derived(
    chapterSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
</script>

<svelte:head>
  <title>{title} — Manual test · ExamFlow</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-3xl px-4 py-8">
    <p class="text-sm text-[var(--own-muted)]">Exam · {examSlug}</p>
    <h1 class="own-heading-xl mt-2">{title}</h1>
    <p class="mt-2 text-sm text-[var(--own-muted)]">
      Manual chapter flow — add your builder UI here (chapter: {chapterSlug}).
    </p>
  </div>
</div>
