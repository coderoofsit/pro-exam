<script lang="ts">
  import type { PageData } from './$types';
  import PYQAccordion from '$lib/components/PYQAccordion.svelte';
  import BackButton from '$lib/components/BackButton.svelte';

  let { data }: { data: PageData } = $props();

  console.log('Page data response:', data);
  console.log('papersByYear:', data.papersByYear);
  console.log('error:', data.error);
  console.log('examSlug:', data.examSlug);

  const papersByYear = data.papersByYear ?? [];
  const error        = data.error ?? null;
  const examSlug     = data.examSlug ?? '';

  const examName = examSlug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

</script>

<svelte:head>
  <title>{examName} — PYQ Papers · Exam Abhyas</title>
</svelte:head>

<div class="pyq-papers-page min-h-full bg-[var(--pyq-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-4 ">
    <div class="mb-4 flex justify-start">
      <BackButton label="Back" tone="pyq" href="/student/tests/pyq" />
    </div>

    {#if error}
      <div class="
        flex items-center gap-3 rounded-2xl px-5 py-4 text-sm
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-[var(--pc-error-text)]
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {error}
      </div>

    <!-- ── Empty state ── -->
    {:else if papersByYear.length === 0}
      <div class="
        flex flex-col items-center justify-center rounded-2xl px-6 py-20 text-center
        bg-[var(--pyq-accordion-bg)]
        border border-[var(--pyq-accordion-border)]
      ">
        <span class="
          flex h-14 w-14 items-center justify-center rounded-2xl mb-4
          bg-[var(--pyq-paper-arrow-bg)]
          text-[var(--pyq-paper-arrow-color)]
        ">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/>
            <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </span>
        <p class="text-sm font-semibold text-[var(--pyq-accordion-title)]">No papers found</p>
        <p class="mt-1 text-xs text-[var(--pyq-header-text)]">
          No PYQ papers are available for this exam yet
        </p>
      </div>

    <!-- ── Data: accordion ── -->
    {:else}
      <PYQAccordion
        {papersByYear}
        {examSlug}
        basePath="/student/tests/pyq"
      />
    {/if}

  </div>
</div>