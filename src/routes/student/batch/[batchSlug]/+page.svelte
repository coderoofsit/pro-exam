<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
  import {
    BATCH_TEST_ATTEMPT_STORAGE_KEY,
    collectQuestionIdsFromAttemptQuestions,
    createTestAttempt,
    findAttemptIdInApiResponse,
    peelTestAttemptEnvelope
  } from '$lib/api/testAttempts';
  import { onMount } from 'svelte';
  import BackButton from '$lib/components/BackButton.svelte';
  import type { PageData } from './$types';

  /** Mirrors `StudentBatchAssignedTest` from the batch load (`+page.server.ts`). */
  type StudentBatchAssignedTest = NonNullable<PageData['tests']>[number];

  let { data }: { data: PageData } = $props();

  onMount(() => {
    if (!data.ssrAuthMissing || typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(AUTH_STORAGE_KEY)?.trim()) return;
    authStore.restore();
    void invalidateAll();
  });

  const batch = $derived(data.batch);
  const tests = $derived(data.tests ?? []);
  const error = $derived(data.error ?? null);
  const batchId = $derived(data.batchId ?? '');
  const lastPage = $derived(data.lastPage ?? 1);
  const currentPage = $derived(data.currentPage ?? 1);
  const showPagination = $derived(lastPage > 1);

  let startingTestId = $state<string | null>(null);
  let startTestError = $state<string | null>(null);
  let pendingStartModalOpen = $state(false);

  function testTitle(t: StudentBatchAssignedTest) {
    const n = t.name;
    if (n && typeof n === 'object' && 'en' in n && typeof n.en === 'string') return n.en;
    return 'Untitled test';
  }

  function hrefForPage(p: number): string {
    const u = new URL(page.url);
    u.searchParams.set('page', String(p));
    return `${u.pathname}${u.search}`;
  }

  function viewAnalysisHref(t: StudentBatchAssignedTest) {
    return `/student/test-attempt?testId=${encodeURIComponent(t.testId)}&batchId=${encodeURIComponent(batchId)}&view=analysis`;
  }

  function isTestStatusPending(t: StudentBatchAssignedTest) {
    return (t.status ?? '').trim().toLowerCase() === 'pending';
  }

  function onStartTestClick(t: StudentBatchAssignedTest) {
    if (isTestStatusPending(t)) {
      pendingStartModalOpen = true;
      return;
    }
    void onStartTest(t);
  }

  function closePendingStartModal() {
    pendingStartModalOpen = false;
  }

  /** POST /api/v1/test-attempts, then navigate (replaces anchor-only navigation with no request). */
  async function onStartTest(t: StudentBatchAssignedTest) {
    if (!batchId || startingTestId) return;
    startTestError = null;
    startingTestId = t._id;
    try {
      const res = await createTestAttempt({ testId: t.testId, batchId });
      if (!res.success) {
        startTestError = res.message || 'Could not start test';
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
        startTestError = 'No questions returned for this test.';
        return;
      }
      try {
        sessionStorage.setItem(
          BATCH_TEST_ATTEMPT_STORAGE_KEY,
          JSON.stringify({
            testId: t.testId,
            batchId,
            questions,
            fetchedAt: Date.now(),
            testName: testTitle(t),
            attemptId: attemptIdResolved,
            questionIds: collectQuestionIdsFromAttemptQuestions(questions),
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
        startTestError = 'Could not save test data in this browser.';
        return;
      }
      await goto(
        `/student/test-attempt?testId=${encodeURIComponent(t.testId)}&batchId=${encodeURIComponent(batchId)}&prelaunch=1&testName=${encodeURIComponent(testTitle(t))}`
      );
    } finally {
      startingTestId = null;
    }
  }

  function batchInitials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'B';
  }

  const batchStatusKey = $derived(batch?.status?.toLowerCase() ?? '');

  const batchTestActionBtnClass =
    'student-batch-test-card__btn inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-lg border border-[var(--page-link)] bg-[color-mix(in_srgb,var(--page-link)_18%,var(--sh-exam-card-arrow-bg))] px-2.5 text-xs font-normal text-[var(--page-link)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-150 hover:border-[var(--page-link)] hover:bg-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-arrow-bg))] hover:shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--page-link)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-w-[7.25rem] sm:rounded-xl sm:px-3 sm:text-sm';
</script>

<svelte:head>
  <title>{batch?.name ?? 'Batch'} — Exam Abhyas</title>
</svelte:head>

<div class="student-batch-detail-page min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-4 pb-24 sm:px-5 sm:py-8 sm:pb-10">
    <div class="mb-3 flex justify-start">
      <BackButton
        label="Back"
        useHistory={false}
        fallback="/student/batch"
        onClick={() => void goto('/student/batch')}
      />
    </div>
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
    {:else if !batch}
      <div
        class="
          flex flex-col items-center justify-center rounded-2xl border px-6 py-20 text-center
          border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
        "
      >
        <span
          class="
            mb-4 flex h-16 w-16 items-center justify-center rounded-2xl
            bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)]
            ring-1 ring-[var(--sh-exam-card-border)]
          "
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <p class="text-base font-semibold text-[var(--sh-section-title)]">Batch not found</p>
        <p class="mt-1 max-w-sm text-sm text-[var(--sh-ai-sub)]">
          This link may be invalid or you no longer have access.
        </p>
      </div>
    {:else}
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        <!-- Batch summary -->
        <aside
          class="
            student-batch-detail-summary w-full shrink-0 rounded-2xl border
            border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
            lg:w-80 lg:sticky lg:top-6
          "
        >
          <div class="p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <div
                class="
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)]
                  ring-1 ring-[var(--sh-exam-card-border)]
                "
                aria-hidden="true"
              >
                {batchInitials(batch.name)}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-base font-semibold leading-snug text-[var(--sh-exam-card-title)] sm:text-lg">
                    {batch.name}
                  </h1>
                  <span
                    class="student-batch-card__status hidden shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex"
                    data-status={batchStatusKey}
                  >
                    {batch.status}
                  </span>
                </div>
                <span
                  class="student-batch-card__status mt-1.5 inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:hidden"
                  data-status={batchStatusKey}
                >
                  {batch.status}
                </span>
                <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
                  {tests.length} test{tests.length === 1 ? '' : 's'} in this batch
                </p>
              </div>
            </div>

            <dl class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div
                class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] px-3 py-2.5"
              >
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Starts</dt>
                <dd class="mt-0.5 text-xs font-semibold text-[var(--sh-exam-card-title)] sm:text-sm">
                  {batch.startDate}
                  <span class="font-normal text-[var(--sh-ai-sub)]"> · </span>
                  {batch.startTime}
                </dd>
              </div>
              <div
                class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] px-3 py-2.5"
              >
                <dt class="text-[10px] font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Ends</dt>
                <dd class="mt-0.5 text-xs font-semibold text-[var(--sh-exam-card-title)] sm:text-sm">
                  {batch.endDate}
                  <span class="font-normal text-[var(--sh-ai-sub)]"> · </span>
                  {batch.endTime}
                </dd>
              </div>
            </dl>

            <div
              class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--sh-exam-card-border)] px-3 py-2.5"
            >
              <span class="text-xs font-medium text-[var(--sh-ai-sub)]">Enrollment</span>
              <span
                class="
                  inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1
                  {batch.isActive
                    ? 'bg-[var(--pc-success-bg)] text-[var(--pc-success-text)] ring-[var(--pc-success-border)]'
                    : 'bg-[color-mix(in_srgb,var(--sh-exam-card-border)_55%,transparent)] text-[var(--sh-ai-sub)] ring-[var(--sh-exam-card-border)]'}
                "
              >
                <span
                  class="h-1.5 w-1.5 rounded-full {batch.isActive ? 'bg-[var(--pc-success-text)]' : 'bg-[var(--sh-ai-sub)]'}"
                ></span>
                {batch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </aside>

        <!-- Tests -->
        <div class="min-w-0 flex-1">
          <h2 class="mb-3 text-sm font-semibold text-[var(--sh-section-title)] lg:sr-only">Tests</h2>
          {#if startTestError}
            <div
              class="mb-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]"
              role="alert"
            >
              {startTestError}
            </div>
          {/if}

          {#if tests.length === 0}
            <div
              class="
                flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center
                border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
              "
            >
              <span
                class="
                  mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
                  bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)]
                "
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                  />
                  <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75" />
                </svg>
              </span>
              <p class="text-sm font-semibold text-[var(--sh-exam-card-title)]">No tests yet</p>
              <p class="mt-1 max-w-xs text-xs leading-relaxed text-[var(--sh-ai-sub)]">
                When your institute assigns tests, they will appear here.
              </p>
            </div>
          {:else}
            <ul class="flex flex-col gap-3" role="list">
              {#each tests as t, i (t._id)}
                <li>
                  <div
                    class="
                      student-batch-test-card flex flex-col overflow-hidden rounded-2xl border
                      border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                      transition-all duration-200
                      hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)]
                      sm:flex-row sm:items-center sm:justify-between
                    "
                  >
                    <div class="student-batch-test-card__content flex min-w-0 flex-1 gap-3 px-4 py-3 sm:pl-4">
                      <span
                        class="
                          inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-lg
                          text-xs font-bold tabular-nums
                          bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)]
                          ring-1 ring-[var(--sh-exam-card-border)]
                        "
                      >
                        {(currentPage - 1) * (data.limit ?? 20) + i + 1}
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold leading-snug text-[var(--sh-exam-card-title)] line-clamp-2">
                          {testTitle(t)}
                        </p>
                        <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--sh-ai-sub)]">
                          <span
                            class="rounded-full border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_50%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sh-exam-card-title)]"
                          >
                            {t.status}
                          </span>
                          <span>{t.questionCount ?? 0} Qs</span>
                          {#if t.settings?.durationMinutes != null}
                            <span class="opacity-50">·</span>
                            <span>{t.settings.durationMinutes} min</span>
                          {/if}
                        </div>
                      </div>
                    </div>

                    <div
                      class="student-batch-test-card__actions flex shrink-0 items-center justify-start gap-2 px-4 pb-3 pt-0 sm:justify-end sm:px-4 sm:py-3 sm:pl-0 sm:pt-0"
                    >
                      {#if t.attempted}
                        <a href={viewAnalysisHref(t)} class="{batchTestActionBtnClass} no-underline">
                          View Analysis
                        </a>
                      {:else}
                        <button
                          type="button"
                          class={batchTestActionBtnClass}
                          disabled={!!startingTestId}
                          onclick={() => onStartTestClick(t)}
                        >
                          {startingTestId === t._id ? 'Starting…' : 'Start Test'}
                        </button>
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ul>

            {#if showPagination}
              <nav
                class="
                  mt-10 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-[var(--sh-exam-card-border)]
                  bg-[var(--sh-exam-card-bg)] px-4 py-3
                "
                aria-label="Pagination"
              >
                {#if currentPage > 1}
                  <a
                    class="
                      inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl border px-4 text-sm font-semibold
                      border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                      text-[var(--sh-exam-card-title)] no-underline
                      transition-all hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-sm
                    "
                    href={hrefForPage(currentPage - 1)}>Previous</a
                  >
                {:else}
                  <span
                    class="
                      inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-xl border px-4 text-sm font-semibold
                      border-[var(--sh-exam-card-border)] opacity-45
                      text-[var(--sh-ai-sub)]
                    ">Previous</span
                  >
                {/if}

                <span class="px-3 text-sm text-[var(--sh-ai-sub)]">
                  Page <span class="font-bold text-[var(--sh-exam-card-title)]">{currentPage}</span>
                  <span class="opacity-60">/</span>
                  <span class="font-bold text-[var(--sh-exam-card-title)]">{lastPage}</span>
                </span>

                {#if currentPage < lastPage}
                  <a
                    class="
                      inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl border px-4 text-sm font-semibold
                      border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                      text-[var(--sh-exam-card-title)] no-underline
                      transition-all hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-sm
                    "
                    href={hrefForPage(currentPage + 1)}>Next</a
                  >
                {:else}
                  <span
                    class="
                      inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-xl border px-4 text-sm font-semibold
                      border-[var(--sh-exam-card-border)] opacity-45
                      text-[var(--sh-ai-sub)]
                    ">Next</span
                  >
                {/if}
              </nav>
            {/if}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

{#if pendingStartModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pending-test-modal-title"
    onclick={(e) => e.target === e.currentTarget && closePendingStartModal()}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 id="pending-test-modal-title" class="text-lg font-bold text-[var(--sh-section-title)]">
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
