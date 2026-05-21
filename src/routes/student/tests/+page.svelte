<script lang="ts">
  import Skeleton from "$lib/components/Skeleton.svelte";
  import GeneralActionButton from "$lib/components/GeneralActionButton.svelte";
  import Pagination from "$lib/components/Pagination.svelte";
  import TestsFiltersDropdown from "$lib/components/student/TestsFiltersDropdown.svelte";
  import { goto, invalidateAll, preloadData } from "$app/navigation";
  import { page } from "$app/state";
  import { authStore, AUTH_STORAGE_KEY } from "$lib/stores/auth";
  import {
    createTestAttempt,
    persistBatchAttemptSessionFromCreateResponse,
  } from "$lib/api/testAttempts";
  import { ATTEMPT_START_ERROR_KEY } from "$lib/student/testAttempt/loadAttemptFromSession";
  import type { GetTestUserFilterOptions } from "$lib/api/tests";
  import { onMount, tick } from "svelte";
  import type { PageData } from "./$types";

  let {
    data,
    basePath = "/student",
    isReadOnly = false,
  }: { data: PageData; basePath?: string; isReadOnly?: boolean } = $props();

  let ownTestsPreloaded = false;
  let ownTestsPreloadPromise: Promise<void> | null = null;

  function warmOwnTests() {
    if (ownTestsPreloaded || ownTestsPreloadPromise) return;

    ownTestsPreloadPromise = preloadData(`${basePath}/tests/own`)
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

  type GetTestUserItem = any; 

  onMount(() => {
    // We can't strictly check ssrAuthMissing here if streamed, 
    // but the effect inside #await will handle data availability.
  });

  let startingTestId = $state<string | null>(null);
  let startTestError = $state<string | null>(null);
  let pendingStartModalOpen = $state(false);
  let viewingAnalysisId = $state<string | null>(null);

  let filtersOpen = $state(false);
  let searchDraft = $state("");
  let searchInputEl = $state<HTMLInputElement | null>(null);
  let cachedFilterOptions = $state<GetTestUserFilterOptions | null>(null);
  let refocusSearchAfterNavigate = $state(false);
  const testsActionBtnClass =
    "student-tests-action-btn !h-9 !rounded-xl !px-3 !text-sm !font-normal !border-[var(--pyq-sort-btn-border)] !bg-[var(--pyq-sort-btn-bg)] !text-[var(--pyq-sort-btn-text)] !shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:!border-[var(--pyq-sort-btn-hover-border)] hover:!bg-[var(--pyq-sort-btn-hover-bg)] hover:!text-[var(--pyq-sort-btn-hover-text)] hover:!shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--page-link)_30%,transparent)] sm:!min-w-[7.25rem]";

  /**
   * Pull `?search=` into the field only when the URL actually changes (back/forward,
   * debounced replaceState, reset). Do not depend on `searchDraft` here — otherwise
   * every keystroke re-runs while the URL is still old and clobbers the input.
   */
  let prevUrlSearchParam = $state<string | null>(null);

  $effect(() => {
    const s = new URLSearchParams(page.url.search).get("search") ?? "";
    if (prevUrlSearchParam === null) {
      prevUrlSearchParam = s;
      searchDraft = s;
      return;
    }
    if (s !== prevUrlSearchParam) {
      prevUrlSearchParam = s;
      searchDraft = s;
    }
  });

  const SEARCH_DEBOUNCE_MS = 1000;

  const urlFilterParams = $derived({
    creatorUserId: page.url.searchParams.get("creatorUserId") ?? "",
    examId: page.url.searchParams.get("examId") ?? "",
    kind: page.url.searchParams.get("kind") ?? "",
    status: page.url.searchParams.get("status") ?? "",
  });

  function focusSearchInput() {
    const el = searchInputEl;
    if (!el) return;
    el.focus({ preventScroll: true });
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }

  $effect(() => {
    const p = data.streamed.testsData;
    if (!p || typeof (p as Promise<unknown>).then !== "function") return;
    void (p as Promise<{ filterOptions?: GetTestUserFilterOptions | null }>).then(
      (testsData) => {
        if (testsData?.filterOptions) cachedFilterOptions = testsData.filterOptions;
        if (!refocusSearchAfterNavigate) return;
        refocusSearchAfterNavigate = false;
        void tick().then(() => focusSearchInput());
      }
    );
  });

  async function navigateWithFilters(
    updates: Record<string, string | undefined>,
    currentSearch?: string
  ) {
    const u = new URL(page.url);
    u.searchParams.set("page", "1");

    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }

    if (!("search" in updates)) {
      const s = (currentSearch ?? searchDraft).trim();
      if (s) u.searchParams.set("search", s);
      else u.searchParams.delete("search");
    }

    const next = `${u.pathname}${u.search}`;
    const cur = `${page.url.pathname}${page.url.search}`;
    if (next === cur) {
      if (refocusSearchAfterNavigate) {
        refocusSearchAfterNavigate = false;
        void tick().then(() => focusSearchInput());
      }
      return;
    }

    await goto(next, { keepFocus: true, noScroll: true, replaceState: true });
  }

  // Handle debounced search
  $effect(() => {
    const q = searchDraft;
    const urlSearch = new URLSearchParams(page.url.search).get("search") ?? "";
    if (q.trim() === urlSearch.trim()) return;

    const t = setTimeout(() => {
      refocusSearchAfterNavigate = true;
      void navigateWithFilters({ search: q.trim() }, q);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  });

  function onFilterSelect(
    key: "creatorUserId" | "examId" | "kind" | "status",
    value: string,
  ) {
    void navigateWithFilters({ [key]: value });
  }

  function resetAll() {
    searchDraft = "";
    void goto(`${basePath}/tests`, { replaceState: true });
  }

  const hasActiveFilters = $derived(
    !!(
      searchDraft.trim() ||
      new URLSearchParams(page.url.search).get("creatorUserId")?.trim() ||
      new URLSearchParams(page.url.search).get("examId")?.trim() ||
      new URLSearchParams(page.url.search).get("kind")?.trim() ||
      new URLSearchParams(page.url.search).get("status")?.trim()
    ),
  );

  function testName(item: GetTestUserItem) {
    const n = item.name;
    if (
      n &&
      typeof n === "object" &&
      "en" in n &&
      typeof n.en === "string" &&
      n.en.trim()
    ) {
      return n.en.trim();
    }
    return "Untitled test";
  }

  function hasExistingAttempt(item: GetTestUserItem) {
    if (item.attempted) return true;
    const id = item.attemptId;
    return typeof id === "string" && id.trim().length > 0;
  }

  function hrefWithParams(
    overrides: Record<string, string | number | undefined | null>,
  ) {
    const u = new URL(page.url);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === null || v === "") u.searchParams.delete(k);
      else u.searchParams.set(k, String(v));
    }
    return `${u.pathname}${u.search}`;
  }

  function hrefForPage(p: number) {
    return hrefWithParams({ page: p });
  }

  async function goToPage(p: number) {
    if (p < 1) return;
    await goto(hrefForPage(p), { keepFocus: true, noScroll: true, replaceState: true });
  }

  // function analysisHref(item: GetTestUserItem) {
  //   const aid = item.attemptId?.trim();
  //   if (!aid) return '#';

  //   const u = new URL(page.url);
  //   u.searchParams.set('analysisAttemptId', aid);
  //   u.searchParams.set('analysisTestName', testName(item));
  //   return `${u.pathname}${u.search}`;
  // }
  /** Point to the new dedicated analysis page. */
  function analysisHref(item: GetTestUserItem) {
    const aid = item.attemptId?.trim();
    if (!aid) return "#";
    return `${basePath}/tests/analysis/${aid}?testName=${encodeURIComponent(testName(item))}`;
  }

  function getAttemptId(item: GetTestUserItem) {
    const aid = item.attemptId;
    return typeof aid === "string" && aid.trim().length > 0 ? aid.trim() : null;
  }

  async function handleViewAnalysis(item: GetTestUserItem) {
    const aid = getAttemptId(item);
    if (!aid) return;
    viewingAnalysisId = aid;
    await goto(analysisHref(item));
    viewingAnalysisId = null;
  }

  function isTestStatusPending(item: GetTestUserItem) {
    return (item.status ?? "").trim().toLowerCase() === "pending";
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

  async function onStartTest(
    item: GetTestUserItem,
    options?: { testAttemptId?: string | null },
  ) {
    if (startingTestId) return;

    const testId = item._id;
    const batchIdStr = item.batchId?.trim() ?? "";
    const name = testName(item);

    startTestError = null;
    startingTestId = item._id;

    const target = `${basePath}/test-attempt?testId=${encodeURIComponent(testId)}&batchId=${encodeURIComponent(batchIdStr)}&prelaunch=1&testName=${encodeURIComponent(name)}`;

    try {
      const res = await createTestAttempt({
        testId,
        batchId: batchIdStr || null,
        testAttemptId: options?.testAttemptId ?? null,
      });

      if (!res.success) {
        try {
          sessionStorage.setItem(
            ATTEMPT_START_ERROR_KEY,
            res.message || "Could not start test",
          );
        } catch {
          // ignore
        }
        startingTestId = null;
        return;
      }

      const persisted = persistBatchAttemptSessionFromCreateResponse(res.data, {
        testId,
        batchId: batchIdStr,
        testName: name,
      });

      if (!persisted.ok) {
        try {
          sessionStorage.setItem(ATTEMPT_START_ERROR_KEY, persisted.message);
        } catch {
          // ignore
        }
        startingTestId = null;
        return;
      }

      try {
        sessionStorage.removeItem(ATTEMPT_START_ERROR_KEY);
      } catch {
        // ignore
      }

      await goto(target);
    } catch (e) {
      try {
        sessionStorage.setItem(
          ATTEMPT_START_ERROR_KEY,
          e instanceof Error ? e.message : "Could not start test",
        );
      } catch {
        // ignore
      }
    } finally {
      startingTestId = null;
    }
  }

  function onReAttemptClick(item: GetTestUserItem) {
    const attemptId = getAttemptId(item);
    if (!attemptId) {
      startTestError = "Could not re-attempt test: missing attempt id.";
      return;
    }
    void onStartTest(item, { testAttemptId: attemptId });
  }
</script>

<svelte:head>
  <title>Tests — Exam Abhyas</title>
</svelte:head>

<div
  class="student-tests-page min-h-full px-3 py-3 font-sans transition-colors duration-300 sm:px-5"
>
  <div class="mx-auto max-w-5xl">
    <section class="mt-1 min-w-0" aria-label="Quick actions">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <a
          href={`${basePath}/tests/pyq`}
          class="group flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-pink-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-pink-glow)] transition hover:border-[var(--cta-pink-border-hover)] hover:bg-[var(--dash-cta-hover-bg)]"
        >
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-pink)]"
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path
                d="M9 9h6M9 12h4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]"
            >PYQ Mock Tests</span
          >
          <span
            class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
          >
            New
          </span>
          <span
            class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5"
            aria-hidden="true">›</span
          >
        </a>

        <a
          href={`${basePath}/tests/own`}
          onmouseenter={warmOwnTests}
          onfocus={warmOwnTests}
          class="group flex min-h-[72px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-cyan-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-cyan-glow)] transition hover:border-[var(--cta-cyan-border-hover)] hover:bg-[var(--dash-cta-hover-bg)]"
        >
          <span
            class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-cyan)]"
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
              <rect
                x="9"
                y="3"
                width="6"
                height="4"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.6"
              />
              <path
                d="M9 12h6M9 15h4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]"
            >Create Your Own Test</span
          >
          <span
            class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
          >
            Updated
          </span>
          <span
            class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5"
            aria-hidden="true">›</span
          >
        </a>
      </div>
    </section>

    <section class="mt-3 min-w-0 sm:mt-4" aria-labelledby="your-tests-heading">
      <div class="mb-3">
        <div class="flex w-full flex-row items-center gap-2">
          <input
            type="search"
            bind:this={searchInputEl}
            bind:value={searchDraft}
            placeholder="Search by name…"
            aria-label="Search tests"
            class="min-h-[2.25rem] min-w-0 w-full max-w-xl rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-3 py-2 text-sm text-[var(--pyq-sort-btn-text)] outline-none ring-0 transition-colors duration-200 placeholder:text-[var(--pyq-header-text)] hover:border-[var(--pyq-sort-btn-hover-border)] hover:bg-[var(--pyq-sort-btn-hover-bg)] focus:border-[var(--pyq-sort-btn-hover-border)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--page-link)_30%,transparent)]"
          />
          {#if cachedFilterOptions}
            <button
              type="button"
              class="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] text-xs font-medium text-[var(--pyq-sort-btn-text)] transition-all duration-150 hover:border-[var(--pyq-sort-btn-hover-border)] hover:bg-[var(--pyq-sort-btn-hover-bg)] hover:text-[var(--pyq-sort-btn-hover-text)] sm:w-auto sm:gap-2 sm:px-3"
              aria-label="Filter tests"
              onclick={() => (filtersOpen = !filtersOpen)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="hidden sm:inline">Filter</span>
            </button>
          {/if}
        </div>

        {#if filtersOpen && cachedFilterOptions}
          <TestsFiltersDropdown
            filterOptions={cachedFilterOptions}
            creatorUserId={urlFilterParams.creatorUserId}
            examId={urlFilterParams.examId}
            kind={urlFilterParams.kind}
            status={urlFilterParams.status}
            {onFilterSelect}
          />
        {/if}
      </div>

      {#await data.streamed.testsData}
        <div class="space-y-4">
          <div class="flex justify-between items-end mb-4">
            <Skeleton width="w-32" height="h-4" />
          </div>
          <div class="flex flex-col gap-3">
            {#each Array(5) as _}
              <div class="skel-card flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex-1 space-y-2">
                  <Skeleton width="w-3/4" height="h-5" />
                  <Skeleton width="w-1/2" height="h-3" />
                </div>
                <Skeleton width="w-32" height="h-10" rounded="rounded-xl" />
              </div>
            {/each}
          </div>
        </div>
      {:then testsData}
        {@const items = testsData.items ?? []}
        {@const error = testsData.error}
        {@const pagination = testsData.pagination}
        {@const currentPage = testsData.page ?? 1}
        {@const totalPages = pagination?.totalPages ?? 1}
        {@const showPagination = totalPages > 1}

        <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <!-- ... error icon ... -->
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

        {#if testsData.ssrAuthMissing}
          <p
            class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-3 text-sm text-[var(--sh-ai-sub)]"
          >
            Sign in to load your tests. If you are signed in, refresh this page.
          </p>
        {:else}
          {#if items.length === 0}
            <div class="flex flex-col items-center justify-center rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-16 text-center">
              <p class="text-sm font-semibold text-[var(--sh-section-title)]">No tests match</p>
              <p class="mt-1 max-w-sm text-xs text-[var(--sh-ai-sub)]">Try clearing search or filters.</p>
            </div>
          {:else}
            <ul class="flex flex-col gap-3" role="list">
              {#each items as item (item._id)}
                <li>
                  <!-- item row contents (same as before) -->
                    <div class="student-tests-card flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] transition-all duration-200 sm:flex-row sm:items-center sm:justify-between hover:border-[var(--pyq-paper-hover-border)] hover:bg-[var(--pyq-paper-hover-bg)] hover:shadow-sm">
                      <div class="student-tests-card__content min-w-0 flex-1 px-4 py-3 sm:pl-5">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--pyq-paper-meta)]">
                          <p class="mr-2 text-base font-semibold text-[var(--pyq-paper-title)] leading-tight">{testName(item)}</p>
                          <span class="rounded bg-[var(--sh-tool-card-bg)] px-1.5 py-0.5 font-bold uppercase tracking-wider">{item.kind}</span>
                          <span>{item.questionCount ?? 0} Qs</span>
                          {#if item.settings?.durationMinutes}<span>· {item.settings.durationMinutes} min</span>{/if}
                          <span>· {item.status}</span>
                        </div>
                      </div>
                      <div class="student-tests-card__actions flex shrink-0 items-center justify-center gap-2 px-4 py-3 sm:py-0">
                        {#if isReadOnly}
                          <GeneralActionButton
                            text="View Test"
                            onClick={() => {
                              const testId = String(item._id ?? '').trim();
                              if (testId) {
                                void goto(`${basePath}/tests/view/${encodeURIComponent(testId)}`);
                              }
                            }}
                            variant="highlight"
                            className={testsActionBtnClass}
                          />
                        {:else if hasExistingAttempt(item)}
                          <GeneralActionButton
                            text="View Analysis"
                            onClick={() => void handleViewAnalysis(item)}
                            className={testsActionBtnClass}
                          />
                          <GeneralActionButton
                            text={startingTestId === item._id ? "Starting..." : "Re-attempt"}
                            onClick={() => onReAttemptClick(item)}
                            disabled={startingTestId === item._id}
                            variant="highlight"
                            className={testsActionBtnClass}
                          />
                        {:else}
                          <GeneralActionButton
                            text={startingTestId === item._id ? "Starting..." : "Start Test"}
                            onClick={() => onStartTestClick(item)}
                            disabled={startingTestId === item._id}
                            variant="highlight"
                            className={testsActionBtnClass}
                          />
                        {/if}
                      </div>
                    </div>
                </li>
              {/each}
            </ul>

            {#if showPagination}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                getHref={hrefForPage}
                keyPrefix="student-tests-list"
                className="mt-8"
              />
            {/if}
          {/if}
        {/if}
      {/await}
    </section>
  </div>
</div>

{#if pendingStartModalOpen}
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && closePendingStartModal()}
    onkeydown={(e) => e.key === "Escape" && closePendingStartModal()}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
    >
      <h2 class="text-lg font-bold text-[var(--sh-section-title)]">
        Test not started yet
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
        This test is still <span
          class="font-semibold text-[var(--sh-section-title)]">pending</span
        >. It will be available to start once your institute opens the test
        window.
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
