<script lang="ts">
  import Skeleton from '$lib/components/Skeleton.svelte';
  import type { BatchTestItem } from '$lib/api/batch';

  type ModalStudentItem = {
    _id?: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    image?: string | null;
    profileImage?: string | null;
    email?: string;
    phone?: string;
    userProfileId?: {
      email?: string;
      phone?: string;
    };
  };

  type Props = {
    open: boolean;
    modeLabel: 'Create' | 'Edit';
    step: 1 | 2;
    tab: 'tests' | 'students';
    batchName: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    maxCapacity: string;
    parsedCapacity: number | null;
    error: string | null;
    success: string | null;
    submitting: boolean;
    testsLoading: boolean;
    testsLoadingMore: boolean;
    testsHasMore: boolean;
    testsError: string | null;
    tests: BatchTestItem[];
    selectedTestIds: string[];
    studentsLoading: boolean;
    studentsLoadingMore: boolean;
    studentsHasMore: boolean;
    students: ModalStudentItem[];
    selectedStudentIds: string[];
    onClose: () => void;
    onSubmitStep1: () => void;
    onBack: () => void;
    onContinue: () => void;
    onSwitchTab: (tab: 'tests' | 'students') => void;
    onToggleTest: (testId: string) => void;
    onToggleStudent: (studentId: string) => void;
    onToggleAllTests: (checked: boolean) => void;
    onToggleAllStudents: (checked: boolean) => void;
    onLoadMoreTests: () => void;
    onLoadMoreStudents: () => void;
    isReady: () => boolean;
    testLabel: (t: BatchTestItem) => string;
    testStatusLabel: (t?: BatchTestItem) => string;
    studentLabel: (u: ModalStudentItem) => string;
    isTestSelected: (testId: string) => boolean;
    isStudentSelected: (studentId: string) => boolean;
  };

  let {
    open,
    modeLabel,
    step,
    tab,
    batchName = $bindable(),
    startDate = $bindable(),
    startTime = $bindable(),
    endDate = $bindable(),
    endTime = $bindable(),
    maxCapacity = $bindable(),
    parsedCapacity,
    error,
    success,
    submitting,
    testsLoading,
    testsLoadingMore,
    testsHasMore,
    testsError,
    tests,
    selectedTestIds,
    studentsLoading,
    studentsLoadingMore,
    studentsHasMore,
    students,
    selectedStudentIds,
    onClose,
    onSubmitStep1,
    onBack,
    onContinue,
    onSwitchTab,
    onToggleTest,
    onToggleStudent,
    onToggleAllTests,
    onToggleAllStudents,
    onLoadMoreTests,
    onLoadMoreStudents,
    isReady,
    testLabel,
    testStatusLabel,
    studentLabel,
    isTestSelected,
    isStudentSelected
  }: Props = $props();

  function maybeLoadMoreTests(el: HTMLElement) {
    if (!testsHasMore || testsLoadingMore || testsLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) onLoadMoreTests();
  }

  function maybeLoadMoreStudents(el: HTMLElement) {
    if (!studentsHasMore || studentsLoadingMore || studentsLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) onLoadMoreStudents();
  }

  function studentId(u: ModalStudentItem): string {
    return String(u._id ?? u.userId ?? '');
  }

  function studentEmail(u: any): string {
    return u?.userProfileId?.email || u?.email || '';
  }

  function studentPhone(u: any): string {
    return u?.userProfileId?.phone || u?.phone || '';
  }

  function studentImage(u: any): string {
    return u?.image || u?.profileImage || '';
  }

  function initialsFromLabel(label: string): string {
    return (
      label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'S'
    );
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-label={`${modeLabel.toLowerCase()} batch`}
    onclick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      class="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-lg font-bold text-[var(--sh-section-title)]">{modeLabel} Batch</h2>

      {#if step === 1}
        <form
          class="mt-4 grid grid-cols-1 gap-3"
          onsubmit={(e) => {
            e.preventDefault();
            onSubmitStep1();
          }}
        >
          <label class="block">
            <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
              Batch name
            </span>
            <input
              type="text"
              autocomplete="off"
              placeholder="e.g. Batch A"
              class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
              bind:value={batchName}
            />
          </label>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
                Start date
              </span>
              <input
                type="date"
                class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
                bind:value={startDate}
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
                Start time
              </span>
              <input
                type="time"
                class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
                bind:value={startTime}
              />
            </label>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
                End date
              </span>
              <input
                type="date"
                class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
                bind:value={endDate}
              />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
                End time
              </span>
              <input
                type="time"
                class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
                bind:value={endTime}
              />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
              Maximum capacity (students)
            </span>
            <input
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              placeholder="e.g. 100"
              class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
              bind:value={maxCapacity}
            />
          </label>

          {#if error}
            <p class="mt-1 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">
              {error}
            </p>
          {/if}

          {#if success}
            <p class="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              {success}
            </p>
          {/if}

          <div class="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]"
              onclick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isReady() || submitting}
            >
              {submitting ? 'Saving…' : `${modeLabel} details`}
            </button>
          </div>
        </form>
      {:else}
        <div class="mt-4">
          <div class="mt-4">
            <div
              class="grid grid-cols-2 border-b border-[var(--sh-exam-card-border)]"
              role="tablist"
              aria-label="Batch assignment tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'tests'}
                class={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'tests'
                    ? 'border-[var(--cta-pink-border-hover)] text-[var(--page-text)]'
                    : 'border-transparent text-[var(--sh-ai-sub)] hover:text-[var(--page-text)]'
                }`}
                onclick={() => onSwitchTab('tests')}
              >
                Tests ({selectedTestIds.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'students'}
                class={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  tab === 'students'
                    ? 'border-[var(--whatsapp-brand)] text-[var(--page-text)]'
                    : 'border-transparent text-[var(--sh-ai-sub)] hover:text-[var(--page-text)]'
                }`}
                onclick={() => onSwitchTab('students')}
              >
                Students ({selectedStudentIds.length})
              </button>
            </div>

            <div class="mt-4">
              {#if tab === 'tests'}
                <section class="flex h-[22rem] flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3" aria-label="Select tests">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-bold text-[var(--page-text)]">Tests</h3>
                    <label class="inline-flex items-center gap-2 text-xs text-[var(--sh-ai-sub)]">
                      <input
                        type="checkbox"
                        checked={tests.length > 0 && tests.every((t) => isTestSelected(t._id))}
                        onchange={(e) => onToggleAllTests((e.currentTarget as HTMLInputElement).checked)}
                      />
                      Select all
                    </label>
                  </div>
                  {#if testsLoading}
                    <div class="mt-3 flex-1 space-y-2 overflow-auto pr-1">
                      {#each Array(6) as _}
                        <div class="flex items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-2">
                          <div class="h-5 w-10 rounded-full bg-[var(--page-card-border)] opacity-20" />
                          <Skeleton width="w-28" height="h-3" />
                        </div>
                      {/each}
                    </div>
                  {:else if testsError}
                    <p class="mt-3 flex-1 text-xs text-semantic-error">{testsError}</p>
                  {:else}
                    <ul
                      class="mt-3 flex-1 space-y-2 overflow-auto pr-1"
                      role="list"
                      onscroll={(e) => maybeLoadMoreTests(e.currentTarget as HTMLElement)}
                    >
                      {#each tests as t (t._id)}
                        <li>
                          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2 text-sm transition-colors hover:border-[var(--sh-exam-card-hover-border)]">
                            <input
                              type="checkbox"
                              checked={isTestSelected(t._id)}
                              onchange={() => onToggleTest(t._id)}
                              class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
                            />
                            <div class="min-w-0 flex-1">
                              <p class="truncate font-semibold text-[var(--page-text)]">{testLabel(t)}</p>
                              <p class="mt-0.5 text-xs text-[var(--sh-ai-sub)]">Status: {testStatusLabel(t)}</p>
                            </div>
                          </label>
                        </li>
                      {/each}
                      {#if tests.length === 0}
                        <li class="text-xs text-[var(--sh-ai-sub)]">No tests loaded.</li>
                      {/if}
                      {#if testsLoadingMore}
                        <li class="text-center text-xs text-[var(--sh-ai-sub)]">Loading more tests...</li>
                      {/if}
                    </ul>
                  {/if}
                </section>
              {:else}
                <section class="flex h-[22rem] flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3" aria-label="Select students">
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-bold text-[var(--page-text)]">Students</h3>
                    <label class="inline-flex items-center gap-2 text-xs text-[var(--sh-ai-sub)]">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && students.every((u) => isStudentSelected(studentId(u)))}
                        onchange={(e) => onToggleAllStudents((e.currentTarget as HTMLInputElement).checked)}
                      />
                      Select all
                    </label>
                  </div>
                  {#if studentsLoading}
                    <div class="mt-3 flex-1 space-y-2 overflow-auto pr-1">
                      {#each Array(7) as _}
                        <div class="flex items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-2">
                          <div class="h-5 w-10 rounded-full bg-[var(--page-card-border)] opacity-20" />
                          <Skeleton width="w-28" height="h-3" />
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <ul
                      class="mt-3 flex-1 space-y-2 overflow-auto pr-1"
                      role="list"
                      onscroll={(e) => maybeLoadMoreStudents(e.currentTarget as HTMLElement)}
                    >
                      {#each students as u, index (`${studentId(u)}-${index}`)}
                        <li>
                          <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2 text-sm transition-colors hover:border-[var(--sh-exam-card-hover-border)]">
                            <input
                              type="checkbox"
                              checked={isStudentSelected(studentId(u))}
                              onchange={() => onToggleStudent(studentId(u))}
                              class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
                            />
                            <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[10px] font-bold text-[var(--page-text)]">
                              {#if studentImage(u)}
                                <img src={studentImage(u)} alt={studentLabel(u)} class="h-full w-full object-cover" />
                              {:else}
                                {initialsFromLabel(studentLabel(u))}
                              {/if}
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="truncate font-semibold text-[var(--page-text)]">{studentLabel(u)}</p>
                              <p class="truncate text-[11px] text-[var(--sh-ai-sub)]">
                                {studentEmail(u) || 'No email'}
                                {#if studentPhone(u)}
                                  <span class="mx-1">•</span>{studentPhone(u)}
                                {/if}
                              </p>
                            </div>
                          </label>
                        </li>
                      {/each}
                      {#if students.length === 0}
                        <li class="text-xs text-[var(--sh-ai-sub)]">No students found.</li>
                      {/if}
                      {#if studentsLoadingMore}
                        <li class="text-center text-xs text-[var(--sh-ai-sub)]">Loading more students...</li>
                      {/if}
                    </ul>
                  {/if}
                </section>
              {/if}
            </div>
          </div>

          {#if error}
            <p class="mt-3 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">{error}</p>
          {/if}
          {#if success}
            <p class="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{success}</p>
          {/if}

          <div class="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]"
              onclick={onClose}
            >
              Cancel
            </button>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]"
                onclick={onBack}
              >
                Back
              </button>
              <button
                type="button"
                class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={selectedTestIds.length === 0 || selectedStudentIds.length === 0 || submitting}
                onclick={onContinue}
              >
                {submitting ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
