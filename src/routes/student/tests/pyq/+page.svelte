<script lang="ts">
  import Exam from '$lib/components/Exam.svelte';
  import type { Exam as ExamApi } from '$lib/api/exams';
  import type { PageData } from './$types';

  let {
    data,
    basePath = '/student/tests/pyq'
  }: { data: PageData; basePath?: string } = $props();

  const exams = $derived((data.exams ?? []) as ExamApi[]);
  const error = $derived(data.error ?? null);
</script>

<svelte:head>
  <title>Chapter wise PYQ — Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-7xl px-4 pt-0 pb-8">
    <!-- Error state -->
    {#if error}
      <div class="
        flex items-center gap-3 rounded-2xl px-5 py-4
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-sm text-[var(--pc-error-text)]
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {error}
      </div>

    <!-- Empty state -->
    {:else if exams.length === 0}
      <div class="
        flex flex-col items-center justify-center
        rounded-2xl px-6 py-16 text-center
        bg-[var(--sh-exam-card-bg)]
        border border-[var(--sh-exam-card-border)]
      ">
        <span class="
          flex h-14 w-14 items-center justify-center rounded-2xl mb-4
          bg-[var(--sh-exam-card-arrow-bg)]
          text-[var(--sh-exam-card-arrow-color)]
        ">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/>
            <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </span>
        <p class="text-sm font-semibold text-[var(--sh-section-title)]">No exams available</p>
        <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">Check back later for PYQ content</p>
      </div>
    {:else}
      <Exam
        exams={exams}
        boardName="All"
        pyq={true}
        hideBoardTitle={true}
        {basePath}
      />
    {/if}

  </div>
</div>
