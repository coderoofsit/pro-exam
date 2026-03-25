<script lang="ts">
  import type { PageData } from './$types';
  import OwnTestChaptersPanel from '$lib/components/OwnTestChaptersPanel.svelte';

  let { data }: { data: PageData } = $props();

  const groupedSubjects = data.groupedSubjects ?? [];
  const error = data.error ?? null;
  const examSlug = data.examSlug ?? '';

  const examName = examSlug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
</script>

<svelte:head>
  <title>{examName} — Create test · ExamFlow</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    {#if error}
      <div
        class="
        flex items-center gap-3 rounded-2xl px-5 py-4 text-sm
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-[var(--pc-error-text)]
      "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        {error}
      </div>
    {:else if groupedSubjects.length === 0}
      <div class="own-empty-panel">
        <span class="own-empty-panel__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
            <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75" />
            <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </span>
        <p class="own-empty-panel__title">No chapters found</p>
        <p class="own-empty-panel__sub">No syllabus data is available for this exam yet.</p>
      </div>
    {:else}
      <OwnTestChaptersPanel {groupedSubjects} {examSlug} />
    {/if}
  </div>
</div>
