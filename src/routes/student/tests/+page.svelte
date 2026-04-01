<script lang="ts">
  import { goto, invalidateAll, preloadData } from '$app/navigation';
  import { page } from '$app/state';
  import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
  import {
    createTestAttempt,
    persistBatchAttemptSessionFromCreateResponse
  } from '$lib/api/testAttempts';
  import TestAttemptAnalysisModal from '$lib/components/TestAttemptAnalysisModal.svelte';
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  let ownTestsPreloaded = false;
  let ownTestsPreloadPromise: Promise<void> | null = null;

  function warmOwnTests() {
    if (ownTestsPreloaded || ownTestsPreloadPromise) return;

    ownTestsPreloadPromise = preloadData('/student/tests/own')
      .then(() => {
        ownTestsPreloaded = true;
      })
      .catch(() => {
        // allow retry if preload fails
      })
      .finally(() => {
        if (!ownTestsPreloaded) ownTestsPreloadPromise = null;
      });
  }

  type GetTestUserItem = NonNullable<PageData['items']>[number];

  let { data }: { data: PageData } = $props();

  onMount(() => {
    if (!data.ssrAuthMissing || typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(AUTH_STORAGE_KEY)?.trim()) return;
    authStore.restore();
    void invalidateAll();
  });

  const items = $derived(data.items ?? []);
  const error = $derived(data.error ?? null);
  const filterOptions = $derived(data.filterOptions);
  const pagination = $derived(data.pagination);
  const currentPage = $derived(data.page ?? 1);
  const totalPages = $derived(pagination?.totalPages ?? 1);
  const showPagination = $derived(totalPages > 1);

  let startingTestId = $state<string | null>(null);
  let startTestError = $state<string | null>(null);
  let pendingStartModalOpen = $state(false);

  let filtersOpen = $state(false);
  let searchDraft = $state('');

  const querySignature = $derived(page.url.search);

  $effect(() => {
    void querySignature;
    searchDraft = data.search ?? '';
  });

  const SEARCH_DEBOUNCE_MS = 350;

  async function navigateWithFilters(updates: Record<string, string | undefined>) {
    const u = new URL(page.url);
    u.searchParams.set('page', '1');

    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }

    if (!('search' in updates)) {
      const s = searchDraft.trim();
      if (s) u.searchParams.set('search', s);
      else u.searchParams.delete('search');
    }

    const next = `${u.pathname}${u.search}`;
    const cur = `${page.url.pathname}${page.url.search}`;
    if (next === cur) return;

    await goto(next, { keepFocus: true, noScroll: true, replaceState: true });
  }

  $effect(() => {
    const q = searchDraft;
    const cur = (data.search ?? '').trim();
    if (q.trim() === cur) return;

    if (q === '') {
      void navigateWithFilters({ search: '' });
      return;
    }

    const t = setTimeout(() => {
      void navigateWithFilters({ search: q.trim() });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  });

  function onFilterSelect(key: 'creatorUserId' | 'examId' | 'kind' | 'status', value: string) {
    void navigateWithFilters({ [key]: value });
  }

  function resetAll() {
    void goto('/student/tests', { replaceState: true });
  }

  const hasActiveFilters = $derived(
    !!(
      searchDraft.trim() ||
      data.creatorUserId?.trim() ||
      data.examId?.trim() ||
      data.kind?.trim() ||
      data.status?.trim()
    )
  );

  function testName(item: GetTestUserItem) {
    const n = item.name;
    if (n && typeof n === 'object' && 'en' in n && typeof n.en === 'string' && n.en.trim()) {
      return n.en.trim();
    }
    return 'Untitled test';
  }

  function hasExistingAttempt(item: GetTestUserItem) {
    if (item.attempted) return true;
    const id = item.attemptId;
    return typeof id === 'string' && id.trim().length > 0;
  }

  function hrefWithParams(overrides: Record<string, string | number | undefined | null>) {
    const u = new URL(page.url);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === null || v === '') u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    return `${u.pathname}${u.search}`;
  }

  function hrefForPage(p: number) {
    return hrefWithParams({ page: p });
  }

  function analysisHref(item: GetTestUserItem) {
    const aid = item.attemptId?.trim();
    if (!aid) return '#';

    const u = new URL(page.url);
    u.searchParams.set('analysisAttemptId', aid);
    u.searchParams.set('analysisTestName', testName(item));
    return `${u.pathname}${u.search}`;
  }

  function closeAttemptAnalysis() {
    const u = new URL(page.url);
    u.searchParams.delete('analysisAttemptId');
    u.searchParams.delete('analysisTestName');
    void goto(`${u.pathname}${u.search}`, { replaceState: true, keepFocus: true, noScroll: true });
  }

  const analysisModalOpen = $derived(
    !!(data.analysisAttemptId && (data.attemptAnalysis != null || data.attemptAnalysisError != null))
  );

  function isTestStatusPending(item: GetTestUserItem) {
    return (item.status ?? '').trim().toLowerCase() === 'pending';
  }

  function onStartTestClick(item: GetTestUserItem) {
    if (isTestStatusPending(item)) {
      pendingStartModalOpen = true;
      return;
    }
    void onStartTest(item);
  }

  function closePendingStartModal() {
    pendingStartModalOpen = false;
  }

  async function onStartTest(item: GetTestUserItem) {
    if (startingTestId) return;

    const testId = item._id;
    const batchIdStr = item.batchId?.trim() ?? '';

    startTestError = null;
    startingTestId = item._id;

    try {
      const res = await createTestAttempt({
        testId,
        batchId: batchIdStr || null
      });

      if (!res.success) {
        startTestError = res.message || 'Could not start test';
        return;
      }

      const persisted = persistBatchAttemptSessionFromCreateResponse(res.data, {
        testId,
        batchId: batchIdStr,
        testName: testName(item)
      });

      if (!persisted.ok) {
        startTestError = persisted.message;
        return;
      }

      await goto(
        `/student/test-attempt?testId=${encodeURIComponent(testId)}&batchId=${encodeURIComponent(batchIdStr)}`
      );
    } finally {
      startingTestId = null;
    }
  }
</script>

<svelte:head>
  <title>Tests — ExamFlow</title>
</svelte:head>

<div class="min-h-full px-4 py-8 font-sans transition-colors duration-300 sm:px-5">
  <div class="mx-auto max-w-5xl">
    <section class="mt-2 min-w-0" aria-label="Quick actions">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href="/student/tests/pyq"
          class="group flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-pink-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-pink-glow)] transition hover:border-[var(--cta-pink-border-hover)] hover:bg-[var(--dash-cta-hover-bg)]"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-pink)]" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path d="M9 9h6M9 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]">PYQ Mock Tests</span>
          <span
            class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
          >
            New
          </span>
          <span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
        </a>

        <a
  href="/student/tests/own"
  onmouseenter={warmOwnTests}
  onfocus={warmOwnTests}
  class="group flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-cyan-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-cyan-glow)] transition hover:border-[var(--cta-cyan-border-hover)] hover:bg-[var(--dash-cta-hover-bg)]"
>
          <span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-cyan)]" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.6" />
              <path d="M9 12h6M9 15h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </span>
          <span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]">Create Your Own Test</span>
          <span
            class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
          >
            Updated
          </span>
          <span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
        </a>
      </div>
    </section>

    <section class="mt-10 min-w-0" aria-labelledby="your-tests-heading">
      <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
       
        {#if pagination}
          <p class="text-xs text-[var(--sh-ai-sub)]">
            {pagination.total} total · page {pagination.page} of {pagination.totalPages}
          </p>
        {/if}
      </div>

      {#if error}
        <div
          class="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]"
          role="alert"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          {error}
        </div>
      {/if}

      {#if startTestError}
        <div
          class="mb-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]"
          role="alert"
        >
          {startTestError}
        </div>
      {/if}

      {#if data.ssrAuthMissing}
        <p class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-3 text-sm text-[var(--sh-ai-sub)]">
          Sign in to load your tests. If you are signed in, refresh this page.
        </p>
      {:else}
        <div class="mb-6">
          <div class="flex flex-row items-stretch gap-2 sm:items-center">
            <input
              type="search"
              bind:value={searchDraft}
              placeholder="Search by name…"
              aria-label="Search tests"
              class="min-h-[2.75rem] min-w-0 flex-1 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm text-[var(--sh-exam-card-title)] outline-none ring-0 transition-colors duration-200 placeholder:text-[var(--sh-ai-sub)] hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_42%,var(--sh-exam-card-border))] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_30%,transparent)]"
            />
            {#if filterOptions}
              <button
                type="button"
                class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-exam-card-title)] transition-colors duration-200 hover:border-[var(--accent-cta-pink)] hover:bg-[color-mix(in_srgb,var(--accent-cta-pink)_8%,var(--sh-exam-card-bg))]"
                aria-expanded={filtersOpen}
                aria-controls="tests-filter-panel"
                aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
                onclick={() => (filtersOpen = !filtersOpen)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {#if hasActiveFilters}
                  <span
                    class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent-cta-pink)] ring-2 ring-[var(--sh-exam-card-bg)]"
                    aria-hidden="true"
                  ></span>
                {/if}
              </button>
            {/if}
          </div>

          {#if filterOptions}
            <div
              id="tests-filter-panel"
              class="mt-3 grid gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] p-4 transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_38%,var(--sh-exam-card-border))] sm:grid-cols-2 lg:grid-cols-4 {filtersOpen
                ? ''
                : 'hidden'}"
            >
              <label class="min-w-0 sm:col-span-2 lg:col-span-1">
                <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]">Creator</span>
                <select
                  name="creatorUserId"
                  value={data.creatorUserId ?? ''}
                  class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm text-[var(--sh-exam-card-title)] outline-none transition-colors hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_38%,var(--sh-exam-card-border))] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_28%,transparent)]"
                >
                  <option value="">All creators</option>
                  {#each filterOptions.creators ?? [] as c (c.userId)}
                    <option value={c.userId}>
                      {c.firstName}
                      {c.lastName} ({c.testsCount})
                    </option>
                  {/each}
                </select>
              </label>
              <label class="min-w-0 sm:col-span-2 lg:col-span-1">
                <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]">Exam</span>
                <select
                  value={data.examId ?? ''}
                  class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm text-[var(--sh-exam-card-title)] outline-none transition-colors hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_38%,var(--sh-exam-card-border))] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_28%,transparent)]"
                  onchange={(e) => onFilterSelect('examId', e.currentTarget.value)}
                >
                  <option value="">All exams</option>
                  {#each filterOptions.exams ?? [] as ex (ex.examId)}
                    <option value={ex.examId}>
                      {ex.name?.en ?? ex.slug} ({ex.count})
                    </option>
                  {/each}
                </select>
              </label>
              <label class="min-w-0">
                <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]">Kind</span>
                <select
                  value={data.kind ?? ''}
                  class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm text-[var(--sh-exam-card-title)] outline-none transition-colors hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_38%,var(--sh-exam-card-border))] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_28%,transparent)]"
                  onchange={(e) => onFilterSelect('kind', e.currentTarget.value)}
                >
                  <option value="">All</option>
                  {#each filterOptions.kinds ?? [] as k (k.value)}
                    <option value={k.value}>
                      {k.value} ({k.count})
                    </option>
                  {/each}
                </select>
              </label>
              <label class="min-w-0">
                <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]">Status</span>
                <select
                  value={data.status ?? ''}
                  class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm text-[var(--sh-exam-card-title)] outline-none transition-colors hover:border-[color-mix(in_srgb,var(--accent-cta-pink)_38%,var(--sh-exam-card-border))] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_28%,transparent)]"
                  onchange={(e) => onFilterSelect('status', e.currentTarget.value)}
                >
                  <option value="">All</option>
                  {#each filterOptions.statuses ?? [] as s (s.value)}
                    <option value={s.value}>
                      {s.value} ({s.count})
                    </option>
                  {/each}
                </select>
              </label>
              <div class="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
                <button
                  type="button"
                  class="inline-flex items-center rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--sh-ai-sub)] transition hover:border-[var(--sh-exam-card-hover-border)]"
                  onclick={() => resetAll()}
                >
                  Reset all
                </button>
              </div>
            </div>
          {/if}
        </div>

        {#if items.length === 0 && !error}
          <div
            class="flex flex-col items-center justify-center rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-16 text-center"
          >
            <p class="text-sm font-semibold text-[var(--sh-section-title)]">No tests match</p>
            <p class="mt-1 max-w-sm text-xs text-[var(--sh-ai-sub)]">Try clearing search or filters.</p>
          </div>
        {:else if items.length > 0}
          <ul class="flex flex-col gap-3" role="list">
            {#each items as item (item._id)}
              <li>
                <div
                  class="flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] pl-0 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-6 hover:border-[var(--pyq-paper-hover-border)] hover:bg-[var(--pyq-paper-hover-bg)] hover:shadow-[var(--pyq-paper-hover-shadow)]"
                >
                  <div class="min-w-0 flex-1 self-stretch px-4 py-4 sm:pl-5">
                    <p class="font-semibold text-[var(--pyq-paper-title)]">{testName(item)}</p>
                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--pyq-paper-meta)]">
                      <span class="rounded-md bg-[color-mix(in_srgb,var(--pyq-paper-border)_40%,transparent)] px-2 py-0.5 font-medium uppercase tracking-wide">{item.kind}</span>
                      <span>{item.questionCount ?? 0} questions</span>
                      {#if item.settings?.durationMinutes != null}
                        <span class="opacity-50">·</span>
                        <span>{item.settings.durationMinutes} min</span>
                      {/if}
                      {#if item.totalMarks != null}
                        <span class="opacity-50">·</span>
                        <span>{item.totalMarks} marks</span>
                      {/if}
                      <span class="opacity-50">·</span>
                      <span>{item.status}</span>
                    </div>
                  </div>
                  <div
                    class="flex w-full shrink-0 items-center justify-center gap-2 border-t border-[var(--pyq-paper-border)] px-4 py-4 sm:w-auto sm:justify-end sm:border-0 sm:px-4 sm:py-4 sm:pl-0"
                  >
                    {#if hasExistingAttempt(item)}
                      <a
                        href={analysisHref(item)}
                        class="btn-cta-subscription-outline min-w-[8.5rem] justify-center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-80" aria-hidden="true">
                          <path
                            d="M4 19V5M4 19l4-4M4 19l-4-4M20 5v14M20 5l-4 4M20 5l4 4"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                          />
                        </svg>
                        View Analysis
                      </a>
                    {:else}
                      <button
                        type="button"
                        class="btn-cta-subscription-outline min-w-[8.5rem] justify-center"
                        disabled={!!startingTestId}
                        onclick={() => onStartTestClick(item)}
                      >
                        {#if startingTestId === item._id}
                          <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                          ></span>
                          Starting…
                        {:else}
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            class="opacity-80"
                            aria-hidden="true"
                          >
                            <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
                          </svg>
                          Start Test
                        {/if}
                      </button>
                    {/if}
                  </div>
                </div>
              </li>
            {/each}
          </ul>

          {#if showPagination}
            <nav
              class="mt-8 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-3"
              aria-label="Pagination"
            >
              {#if currentPage > 1}
                <a
                  class="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 text-sm font-semibold text-[var(--sh-exam-card-title)] no-underline transition hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-sm"
                  href={hrefForPage(currentPage - 1)}>Previous</a
                >
              {:else}
                <span
                  class="inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] px-4 text-sm font-semibold opacity-45 text-[var(--sh-ai-sub)]"
                  >Previous</span
                >
              {/if}

              <span class="px-3 text-sm text-[var(--sh-ai-sub)]">
                Page <span class="font-bold text-[var(--sh-exam-card-title)]">{currentPage}</span>
                <span class="opacity-60">/</span>
                <span class="font-bold text-[var(--sh-exam-card-title)]">{totalPages}</span>
              </span>

              {#if currentPage < totalPages}
                <a
                  class="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 text-sm font-semibold text-[var(--sh-exam-card-title)] no-underline transition hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-sm"
                  href={hrefForPage(currentPage + 1)}>Next</a
                >
              {:else}
                <span
                  class="inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] px-4 text-sm font-semibold opacity-45 text-[var(--sh-ai-sub)]"
                  >Next</span
                >
              {/if}
            </nav>
          {/if}
        {/if}
      {/if}
    </section>
  </div>
</div>

{#if pendingStartModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tests-pending-test-modal-title"
    onclick={(e) => e.target === e.currentTarget && closePendingStartModal()}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 id="tests-pending-test-modal-title" class="text-lg font-bold text-[var(--sh-section-title)]">
        Test not started yet
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
        This test is still <span class="font-semibold text-[var(--sh-section-title)]">pending</span>. It will be
        available to start once your institute opens the test window.
      </p>
      <button
        type="button"
        class="btn-cta-subscription mt-6 w-full px-6 py-2.5 text-sm"
        onclick={closePendingStartModal}
      >
        OK
      </button>
    </div>
  </div>
{/if}

<TestAttemptAnalysisModal
  open={analysisModalOpen}
  testName={(data.analysisTestName ?? '').trim() || 'Test'}
  summary={data.attemptAnalysis}
  error={data.attemptAnalysisError}
  onclose={closeAttemptAnalysis}
/>
