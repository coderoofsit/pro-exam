<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    BATCH_TEST_ATTEMPT_STORAGE_KEY,
    createTestAttempt,
    fetchTestAttemptById,
    findAttemptIdInApiResponse,
    peelTestAttemptEnvelope
  } from '$lib/api/testAttempts';

  // ── Types ──────────────────────────────────────────────────────────────
  export type PaperItem = {
    _id: string;
    testId?: string;
    testAttemptedId?: string;
    name: string;
    slug: string;
    shift: string;
    questionCount: number;
    examSchedule: {
      date: string;
      timing: string;
      duration: string;
    };
  };

  export type PapersByYearItem = {
    year: number;
    papers: PaperItem[];
  };

  type Props = {
    papersByYear: PapersByYearItem[];
    examSlug: string;
    basePath?: string;
  };

  // ── Props ──────────────────────────────────────────────────────────────
  let {
    papersByYear,
    examSlug,
    basePath = '/student/tests/pyq'
  }: Props = $props();

  // ── Accordion state ────────────────────────────────────────────────────
  let sortOrder      = $state<'asc' | 'desc'>('desc');
  let selectedYear   = $state<number | 'all'>('all');
  let filterDropOpen = $state(false);
  let openYears      = $state<Set<number>>(new Set());
  let startingPaperId = $state<string | null>(null);
  let viewingPaperId = $state<string | null>(null);
  let viewingAnalysisId = $state<string | null>(null);
  let startPaperError = $state<string | null>(null);

async function viewPaper(paper: PaperItem) {
  if (viewingPaperId || startingPaperId || viewingAnalysisId) return;
  const resolvedExamSlug = (examSlug ?? '').trim();
  const resolvedPaperId = (paper?._id ?? '').trim();
  if (!resolvedExamSlug || !resolvedPaperId) return;
  viewingPaperId = paper._id;
  try {
    await goto(`${basePath}/${encodeURIComponent(resolvedExamSlug)}/${encodeURIComponent(resolvedPaperId)}`);
  } finally {
    viewingPaperId = null;
  }
}

  function analysisHref(paper: PaperItem, attemptId: string) {
    return `/student/tests/analysis/${encodeURIComponent(attemptId)}?testName=${encodeURIComponent(paper.name)}`;
  }

  async function viewAnalysis(paper: PaperItem) {
    const attemptId = (paper.testAttemptedId ?? '').trim();
    if (!attemptId) return;
    startPaperError = null;
    viewingAnalysisId = paper._id;
    try {
      const res = await fetchTestAttemptById(attemptId);
      if (!res.success) {
        startPaperError = res.message || 'Could not load analysis';
        return;
      }
      await goto(analysisHref(paper, attemptId));
    } finally {
      viewingAnalysisId = null;
    }
  }

  async function startPaperTest(paper: PaperItem) {
    if (startingPaperId) return;
    const testId = (paper.testId ?? '').trim();
    if (!testId) {
      startPaperError = 'Test id is missing for this paper.';
      return;
    }
    startPaperError = null;
    startingPaperId = paper._id;
    try {
      const res = await createTestAttempt({ testId, batchId: null });
      if (!res.success) {
        startPaperError = res.message || 'Could not start test';
        return;
      }
      const body = res.data as Record<string, unknown> | undefined;
      const peeled = peelTestAttemptEnvelope(body ?? res.data);
      const payload =
        peeled && typeof peeled === 'object' ? (peeled as Record<string, unknown>) : {};
      const attemptIdResolved =
        (typeof payload.attemptId === 'string' && payload.attemptId.trim()) ||
        (typeof payload.attempt_id === 'string' && payload.attempt_id.trim()) ||
        findAttemptIdInApiResponse(res.data);
      const questions = Array.isArray(payload.questions) ? payload.questions : [];
      if (!questions.length) {
        startPaperError = 'No questions returned for this test.';
        return;
      }
      try {
        sessionStorage.setItem(
          BATCH_TEST_ATTEMPT_STORAGE_KEY,
          JSON.stringify({
            testId,
            batchId: '',
            questions,
            fetchedAt: Date.now(),
            testName: paper.name,
            attemptId: attemptIdResolved,
            durationMinutes:
              typeof payload.durationMinutes === 'number'
                ? payload.durationMinutes
                : typeof payload.duration_minutes === 'number'
                  ? payload.duration_minutes
                  : undefined,
            questionCount:
              typeof payload.questionCount === 'number'
                ? payload.questionCount
                : typeof payload.question_count === 'number'
                  ? payload.question_count
                  : undefined,
            startedAt:
              typeof payload.startedAt === 'string'
                ? payload.startedAt
                : typeof payload.started_at === 'string'
                  ? payload.started_at
                  : undefined,
            expiresAt:
              typeof payload.expiresAt === 'string'
                ? payload.expiresAt
                : typeof payload.expires_at === 'string'
                  ? payload.expires_at
                  : undefined
          })
        );
      } catch {
        startPaperError = 'Could not save test data in this browser.';
        return;
      }
      await goto(`/student/test-attempt?testId=${encodeURIComponent(testId)}&batchId=`);
    } finally {
      startingPaperId = null;
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const allYears = $derived(
    [...new Set(papersByYear.map(g => g.year))].sort((a, b) => b - a)
  );

  const sortedAll = $derived(
    [...papersByYear].sort((a, b) =>
      sortOrder === 'desc' ? b.year - a.year : a.year - b.year
    )
  );

  const visible = $derived(
    selectedYear === 'all'
      ? sortedAll
      : sortedAll.filter(g => g.year === selectedYear)
  );

  const totalPapers = $derived(
    papersByYear.reduce((sum, g) => sum + g.papers.length, 0)
  );

  const visiblePapers = $derived(
    visible.reduce((sum, g) => sum + g.papers.length, 0)
  );

  function openFirstVisibleYear() {
    const firstYear = visible[0]?.year;
    openYears = new Set(typeof firstYear === 'number' ? [firstYear] : []);
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function toggleAccordion(year: number) {
    const next = new Set(openYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    openYears = next;
  }

  function toggleSort() {
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    openFirstVisibleYear();
  }

  function selectYear(year: number | 'all') {
    selectedYear = year;
    filterDropOpen = false;
    if (year !== 'all') openYears = new Set([year]);
    else openFirstVisibleYear();
  }

  function examTitle() {
    return examSlug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function yearLabel(year: number) {
    const count = papersByYear.find(g => g.year === year)?.papers.length ?? 0;
    return `${examTitle()} ${year} Papers (${count} Papers)`;
  }

  onMount(() => {
    openFirstVisibleYear();
  });
</script>

<!-- ════════════════════════════════════════════════════════
     TOOLBAR
════════════════════════════════════════════════════════ -->
{#if startPaperError}
  <div
    class="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]"
    role="alert"
  >
    {startPaperError}
  </div>
{/if}

<div class="mb-3 flex flex-wrap items-center justify-between gap-3">

  <p class="text-sm text-[var(--pyq-header-text)]">
    Showing all PYQ mock
    <span class="font-semibold text-[var(--pyq-header-count)]">
      ({visiblePapers}{selectedYear !== 'all' ? ` of ${totalPapers}` : ''})
    </span>
  </p>

  <div class="flex items-center gap-2">

    <!-- Year filter -->
    <div class="relative" class:z-[80]={filterDropOpen}>
      <button
        type="button"
        onclick={() => { filterDropOpen = !filterDropOpen; }}
        class="
          inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium
          bg-[var(--pyq-sort-btn-bg)] border border-[var(--pyq-sort-btn-border)]
          text-[var(--pyq-sort-btn-text)] transition-all duration-150
          hover:bg-[var(--pyq-sort-btn-hover-bg)] hover:border-[var(--pyq-sort-btn-hover-border)]
          hover:text-[var(--pyq-sort-btn-hover-text)]
          {filterDropOpen ? 'border-[var(--pyq-sort-btn-hover-border)] bg-[var(--pyq-sort-btn-hover-bg)] text-[var(--pyq-sort-btn-hover-text)]' : ''}
        "
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="text-[var(--pyq-sort-btn-icon)]">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/>
          <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {selectedYear === 'all' ? 'All Years' : String(selectedYear)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          class="text-[var(--pyq-sort-btn-icon)] transition-transform duration-200 {filterDropOpen ? 'rotate-180' : ''}">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      {#if filterDropOpen}
        <button
          type="button"
          class="fixed inset-0 z-[70] cursor-default bg-[var(--pyq-dropdown-scrim)] backdrop-blur-[1px]"
          aria-label="Close year filter"
          onclick={() => { filterDropOpen = false; }}></button>

        <div
          class="
          absolute right-0 z-[80] mt-2 w-72 overflow-hidden rounded-2xl
          border border-[var(--pyq-accordion-active-border)]
          bg-[var(--pyq-dropdown-bg)] shadow-[0_16px_48px_rgba(5,7,13,0.28)]
        "
        >
          <button type="button" onclick={() => selectYear('all')}
            class="
              flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm
              border-b border-[var(--pyq-accordion-divider)] transition-colors duration-100
              {selectedYear === 'all'
                ? 'bg-[var(--pyq-paper-badge-bg)] text-[var(--pyq-paper-badge-text)] font-semibold'
                : 'text-[var(--pyq-accordion-title)] hover:bg-[var(--pyq-accordion-hover-bg)]'}
            ">
            <span>All Years</span>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="px-2 py-0.5 rounded-full text-[11px]
                bg-[var(--pyq-paper-badge-bg)] border border-[var(--pyq-paper-badge-border)]
                text-[var(--pyq-paper-badge-text)]">{totalPapers} papers</span>
              {#if selectedYear === 'all'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
            </div>
          </button>

          <div class="max-h-64 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {#each allYears as year}
              {@const count = papersByYear.find(g => g.year === year)?.papers.length ?? 0}
              <button type="button" onclick={() => selectYear(year)}
                class="
                  flex w-full items-center justify-between gap-2
                  px-4 py-3 text-left text-sm transition-colors duration-100
                  {selectedYear === year
                    ? 'bg-[var(--pyq-paper-badge-bg)] text-[var(--pyq-paper-badge-text)] font-semibold'
                    : 'text-[var(--pyq-accordion-title)] hover:bg-[var(--pyq-accordion-hover-bg)]'}
                ">
                <span>{examTitle()} - {year} - Papers</span>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="px-2 py-0.5 rounded-full text-[11px]
                    bg-[var(--pyq-paper-badge-bg)] border border-[var(--pyq-paper-badge-border)]
                    text-[var(--pyq-paper-badge-text)]">{count}</span>
                  {#if selectedYear === year}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Sort -->
    <button type="button" onclick={toggleSort}
      title="Sort {sortOrder === 'desc' ? 'oldest first' : 'newest first'}"
      class="
        inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium
        bg-[var(--pyq-sort-btn-bg)] border border-[var(--pyq-sort-btn-border)]
        text-[var(--pyq-sort-btn-text)] transition-all duration-150
        hover:bg-[var(--pyq-sort-btn-hover-bg)] hover:border-[var(--pyq-sort-btn-hover-border)]
        hover:text-[var(--pyq-sort-btn-hover-text)]
      ">
      <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] text-[var(--pyq-sort-btn-icon)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 3v18M7 21l-3-3M7 21l3-3M17 21V3M17 3l-3 3M17 3l3 3"
            stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      Sort
      <span class="font-bold text-[var(--pyq-sort-btn-icon)]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
    </button>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     ACCORDION LIST
════════════════════════════════════════════════════════ -->
<div class="flex flex-col gap-2">
  {#each visible as group (group.year)}
    {@const isOpen = openYears.has(group.year)}

    <div class="
      rounded-xl border overflow-hidden
      transition-[border-color,background] duration-200
      {isOpen
        ? 'bg-[var(--pyq-accordion-open-bg)] border-[var(--pyq-accordion-open-border)]'
        : 'bg-[var(--pyq-accordion-bg)] border-[var(--pyq-accordion-border)]'}
    ">
      <!-- Trigger -->
      <button type="button" onclick={() => toggleAccordion(group.year)}
        aria-expanded={isOpen}
        class="
          w-full flex items-center justify-between px-4 py-3 text-left
          transition-colors duration-150
          {isOpen ? '' : 'hover:bg-[var(--pyq-accordion-hover-bg)]'}
        ">
        <span class="text-sm font-semibold text-[var(--pyq-accordion-title)]">
          {yearLabel(group.year)}
        </span>
        <span class="
          flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full border
          border-[var(--pyq-accordion-border)]
          bg-[var(--pyq-accordion-hover-bg)]
          text-[var(--pyq-accordion-chevron-active)] transition-all duration-200
          {isOpen ? 'rotate-180 border-[var(--pyq-accordion-open-border)] bg-[var(--pyq-accordion-open-bg)]' : ''}
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>

      <!-- Body -->
      {#if isOpen}
        <div class="px-2.5 pb-2.5">
          <div class="mb-1.5 border-t border-[var(--pyq-accordion-divider)]"></div>

          <div class="flex flex-col gap-1.5">
            {#each group.papers as paper (paper._id)}
              <div
                class="flex flex-col gap-2 overflow-hidden rounded-xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] pl-0 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-3 hover:border-[var(--pyq-paper-hover-border)] hover:bg-[var(--pyq-paper-hover-bg)] hover:shadow-[var(--pyq-paper-hover-shadow)]"
              >
                <div class="min-w-0 flex-1 px-3 py-2 sm:pl-3.5">
                  <div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    <p class="font-semibold text-[var(--pyq-paper-title)]">{paper.name}</p>
                    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--pyq-paper-meta)]">
                    {#if paper.examSchedule?.date}
                      <span>{paper.examSchedule.date}</span>
                      <span class="opacity-50">·</span>
                    {/if}
                    {#if paper.examSchedule?.duration}
                      <span>{paper.examSchedule.duration}</span>
                      <span class="opacity-50">·</span>
                    {/if}
                    <span>{paper.questionCount ?? 0} questions</span>
                    {#if paper.shift}
                      <span class="opacity-50">·</span>
                      <span
                        class="rounded-md bg-[color-mix(in_srgb,var(--pyq-paper-border)_40%,transparent)] px-2 py-0.5 font-medium uppercase tracking-wide"
                        >{paper.shift}</span
                      >
                    {/if}
                    </div>
                  </div>
                </div>
              <div
  class="flex w-full shrink-0 items-center justify-center gap-1.5 border-t border-[var(--pyq-paper-border)] px-2 py-2 sm:w-auto sm:justify-end sm:border-0 sm:px-2 sm:py-2 sm:pl-0"
>
  <!-- View Paper Button -->
  <button
    type="button"
    class="btn-cta-subscription-outline h-8 min-w-[7.25rem] px-3 text-xs justify-center"
    disabled={startingPaperId !== null || viewingAnalysisId !== null || viewingPaperId !== null}
    onclick={() => void viewPaper(paper)}
  >
    {#if viewingPaperId === paper._id}
      <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
      Opening...
    {:else}
      View Paper
    {/if}
  </button>

  {#if !(paper.testAttemptedId ?? '').trim()}
    <!-- Start Test Button -->
    <button
      type="button"
      class="btn-cta-subscription-outline h-8 min-w-[7.25rem] px-3 text-xs justify-center disabled:opacity-60"
      disabled={startingPaperId !== null || viewingAnalysisId !== null}
      onclick={() => startPaperTest(paper)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-80" aria-hidden="true">
        <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
      </svg>
      {startingPaperId === paper._id ? 'Starting…' : 'Start Test'}
    </button>
  {:else}
    <button
      type="button"
      class="btn-cta-subscription-outline h-8 min-w-[7.25rem] px-3 text-xs justify-center disabled:opacity-60"
      disabled={startingPaperId !== null || viewingAnalysisId !== null}
      onclick={() => void viewAnalysis(paper)}
    >
      {viewingAnalysisId === paper._id ? 'Opening…' : 'View Analysis'}
    </button>
  {/if}
</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>