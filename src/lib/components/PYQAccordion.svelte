<script lang="ts">
  import { goto } from '$app/navigation';

  // ── Types ──────────────────────────────────────────────────────────────
  export type PaperItem = {
    _id: string;
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

  // ── Modal state ────────────────────────────────────────────────────────
  let modalPaper = $state<PaperItem | null>(null);
  let modalYear  = $state<number | null>(null);

  function openModal(paper: PaperItem, year: number) {
    modalPaper = paper;
    modalYear  = year;
  }

  function closeModal() {
    modalPaper = null;
    modalYear  = null;
  }

  function handleStartTest() {
    if (!modalPaper) return;
    goto(`/student/test-attempt/${examSlug}/${modalPaper.slug}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
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

  // ── Helpers ────────────────────────────────────────────────────────────
  function toggleAccordion(year: number) {
    const next = new Set(openYears);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    openYears = next;
  }

  function toggleSort() {
    sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
  }

  function selectYear(year: number | 'all') {
    selectedYear = year;
    filterDropOpen = false;
    if (year !== 'all') openYears = new Set([year]);
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- ════════════════════════════════════════════════════════
     TOOLBAR
════════════════════════════════════════════════════════ -->
<div class="flex items-center justify-between gap-3 mb-5 flex-wrap">

  <p class="text-sm text-[var(--pyq-header-text)]">
    Showing all PYQ mock
    <span class="font-semibold text-[var(--pyq-header-count)]">
      ({visiblePapers}{selectedYear !== 'all' ? ` of ${totalPapers}` : ''})
    </span>
  </p>

  <div class="flex items-center gap-2">

    <!-- Year filter -->
    <div class="relative">
      <button
        type="button"
        onclick={() => { filterDropOpen = !filterDropOpen; }}
        class="
          inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium
          bg-[var(--pyq-sort-btn-bg)] border border-[var(--pyq-sort-btn-border)]
          text-[var(--pyq-sort-btn-text)] transition-all duration-150
          hover:bg-[var(--pyq-sort-btn-hover-bg)] hover:border-[var(--pyq-sort-btn-hover-border)]
          hover:text-[var(--pyq-sort-btn-hover-text)]
          {filterDropOpen ? 'border-[var(--pyq-sort-btn-hover-border)] text-[var(--pyq-sort-btn-hover-text)] bg-[var(--pyq-sort-btn-hover-bg)]' : ''}
        "
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/>
          <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {selectedYear === 'all' ? 'All Years' : String(selectedYear)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          class="transition-transform duration-200 {filterDropOpen ? 'rotate-180' : ''}">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      {#if filterDropOpen}
        <button class="fixed inset-0 z-10 cursor-default bg-transparent"
          aria-label="Close year filter"
          onclick={() => { filterDropOpen = false; }}></button>

        <div class="
          absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl
          bg-[var(--pyq-accordion-bg)] border border-[var(--pyq-accordion-active-border)]
          shadow-[0_16px_48px_rgba(5,7,13,0.20)]
        ">
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
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
        bg-[var(--pyq-sort-btn-bg)] border border-[var(--pyq-sort-btn-border)]
        text-[var(--pyq-sort-btn-text)] transition-all duration-150
        hover:bg-[var(--pyq-sort-btn-hover-bg)] hover:border-[var(--pyq-sort-btn-hover-border)]
        hover:text-[var(--pyq-sort-btn-hover-text)]
      ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M7 3v18M7 21l-3-3M7 21l3-3M17 21V3M17 3l-3 3M17 3l3 3"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sort
      <span class="font-bold opacity-70">{sortOrder === 'desc' ? '↓' : '↑'}</span>
    </button>
  </div>
</div>

<!-- ════════════════════════════════════════════════════════
     ACCORDION LIST
════════════════════════════════════════════════════════ -->
<div class="flex flex-col gap-3">
  {#each visible as group (group.year)}
    {@const isOpen = openYears.has(group.year)}

    <div class="
      rounded-2xl border overflow-hidden
      transition-[border-color,background] duration-200
      {isOpen
        ? 'bg-[var(--pyq-accordion-active-bg)] border-[var(--pyq-accordion-active-border)]'
        : 'bg-[var(--pyq-accordion-bg)] border-[var(--pyq-accordion-border)]'}
    ">
      <!-- Trigger -->
      <button type="button" onclick={() => toggleAccordion(group.year)}
        aria-expanded={isOpen}
        class="
          w-full flex items-center justify-between px-5 py-4 text-left
          transition-colors duration-150
          {isOpen ? '' : 'hover:bg-[var(--pyq-accordion-hover-bg)]'}
        ">
        <span class="text-sm font-semibold text-[var(--pyq-accordion-title)]">
          {yearLabel(group.year)}
        </span>
        <span class="
          flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full
          transition-all duration-200
          {isOpen
            ? 'bg-[var(--pyq-paper-arrow-bg)] text-[var(--pyq-accordion-chevron-active)] rotate-180'
            : 'text-[var(--pyq-accordion-chevron)]'}
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>

      <!-- Body -->
      {#if isOpen}
        <div class="px-4 pb-4">
          <div class="border-t border-[var(--pyq-accordion-divider)] mb-3"></div>

          <div class="flex flex-col gap-2">
            {#each group.papers as paper (paper._id)}
              <!-- Button instead of <a> — opens modal instead of navigating -->
              <button
                type="button"
                onclick={() => openModal(paper, group.year)}
                class="
                  group flex items-center justify-between gap-4 w-full text-left
                  rounded-xl px-4 py-3
                  bg-[var(--pyq-paper-bg)]
                  border border-[var(--pyq-paper-border)]
                  transition-all duration-150
                  hover:bg-[var(--pyq-paper-hover-bg)]
                  hover:border-[var(--pyq-paper-hover-border)]
                  hover:shadow-[var(--pyq-paper-hover-shadow)]
                "
              >
                <!-- Name -->
                <p class="min-w-0 flex-1 text-sm font-semibold text-[var(--pyq-paper-title)] truncate">
                  {paper.name}
                </p>

                <!-- Meta -->
                <div class="hidden sm:flex items-center gap-3 flex-shrink-0 text-xs text-[var(--pyq-paper-meta)]">
                  {#if paper.examSchedule?.date}
                    <span>{paper.examSchedule.date}</span>
                    <span class="opacity-30">·</span>
                  {/if}
                  {#if paper.examSchedule?.duration}
                    <span>{paper.examSchedule.duration}</span>
                    <span class="opacity-30">·</span>
                  {/if}
                  <span>{paper.questionCount ?? 0} Qs</span>
                  {#if paper.shift}
                    <span class="opacity-30">·</span>
                    <span class="
                      px-2 py-0.5 rounded-full font-medium
                      bg-[var(--pyq-paper-badge-bg)]
                      border border-[var(--pyq-paper-badge-border)]
                      text-[var(--pyq-paper-badge-text)]
                    ">{paper.shift}</span>
                  {/if}
                </div>

                <!-- Arrow -->
                <span class="
                  flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full
                  bg-[var(--pyq-paper-arrow-bg)] text-[var(--pyq-paper-arrow-color)]
                  transition-colors duration-150
                  group-hover:bg-[var(--pyq-paper-arrow-hover-bg)]
                ">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7v10"
                      stroke="currentColor" stroke-width="2.2"
                      stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>

<!-- ════════════════════════════════════════════════════════
     PAPER DETAIL MODAL
════════════════════════════════════════════════════════ -->
{#if modalPaper}
  <!-- Backdrop -->
  <button
    class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-default"
    aria-label="Close modal"
    onclick={closeModal}
  ></button>

  <!-- Panel -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    class="
      fixed left-1/2 top-1/2 z-50
      -translate-x-1/2 -translate-y-1/2
      w-[calc(100vw-2rem)] max-w-md
      rounded-2xl overflow-hidden
      bg-[var(--pyq-accordion-bg)]
      border border-[var(--pyq-accordion-active-border)]
      shadow-[0_24px_64px_rgba(5,7,13,0.5)]
    "
  >

    <!-- Modal header -->
    <div class="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-[var(--pyq-accordion-divider)]">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-widest text-[var(--pyq-paper-badge-text)] mb-1">
          {examTitle()} · {modalYear}
        </p>
        <h2 id="modal-title" class="text-base font-bold text-[var(--pyq-accordion-title)] leading-snug">
          {modalPaper.name}
        </h2>
      </div>
      <!-- Close button -->
      <button
        type="button"
        onclick={closeModal}
        aria-label="Close"
        class="
          flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl
          bg-[var(--pyq-paper-bg)] text-[var(--pyq-accordion-chevron)]
          hover:bg-[var(--pyq-accordion-hover-bg)] hover:text-[var(--pyq-accordion-title)]
          transition-colors duration-150
        "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Modal body: details grid -->
    <div class="px-6 py-5 grid grid-cols-2 gap-3">

      {#if modalPaper.examSchedule?.date}
        <div class="flex flex-col gap-1 rounded-xl p-3 bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pyq-paper-meta-label)]">Date</span>
          <span class="text-sm font-medium text-[var(--pyq-accordion-title)]">{modalPaper.examSchedule.date}</span>
        </div>
      {/if}

      {#if modalPaper.examSchedule?.timing}
        <div class="flex flex-col gap-1 rounded-xl p-3 bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pyq-paper-meta-label)]">Timing</span>
          <span class="text-sm font-medium text-[var(--pyq-accordion-title)]">{modalPaper.examSchedule.timing}</span>
        </div>
      {/if}

      {#if modalPaper.examSchedule?.duration}
        <div class="flex flex-col gap-1 rounded-xl p-3 bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pyq-paper-meta-label)]">Duration</span>
          <span class="text-sm font-medium text-[var(--pyq-accordion-title)]">{modalPaper.examSchedule.duration}</span>
        </div>
      {/if}

      <div class="flex flex-col gap-1 rounded-xl p-3 bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pyq-paper-meta-label)]">Questions</span>
        <span class="text-sm font-medium text-[var(--pyq-accordion-title)]">{modalPaper.questionCount ?? 0}</span>
      </div>

      {#if modalPaper.shift}
        <div class="flex flex-col gap-1 rounded-xl p-3 bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-[var(--pyq-paper-meta-label)]">Shift</span>
          <span class="text-sm font-medium text-[var(--pyq-accordion-title)]">{modalPaper.shift}</span>
        </div>
      {/if}

    </div>

    <!-- Modal footer: actions -->
    <div class="flex items-center justify-between gap-3 px-6 pb-6">
      <button
        type="button"
        onclick={closeModal}
        class="
          flex-1 h-11 rounded-xl text-sm font-medium
          bg-[var(--pyq-paper-bg)] border border-[var(--pyq-paper-border)]
          text-[var(--pyq-accordion-chevron)]
          hover:bg-[var(--pyq-accordion-hover-bg)] hover:text-[var(--pyq-accordion-title)]
          transition-colors duration-150
        "
      >
        Cancel
      </button>

      <button
        type="button"
        onclick={handleStartTest}
        class="
          flex-1 h-11 rounded-xl text-sm font-semibold
          bg-[linear-gradient(135deg,#8B5CF6_0%,#4f7eff_100%)]
          text-white
          shadow-[0_4px_20px_rgba(139,92,246,0.35)]
          hover:shadow-[0_6px_28px_rgba(139,92,246,0.55)]
          transition-shadow duration-150
          flex items-center justify-center gap-2
        "
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M5 3l14 9-14 9V3Z" fill="currentColor"/>
        </svg>
        Start Test
      </button>
    </div>
  </div>
{/if}