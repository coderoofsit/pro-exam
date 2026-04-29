<script lang="ts">
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import StudentBatchCard from '$lib/components/StudentBatchCard.svelte';
  import { debounce } from '$lib/utils/debounce';
  import type { PageData } from './$types';
  import { fetchBatchStudents, type BatchStudentItem } from '$lib/api/teacher';
  import {
    createBatch,
    fetchBatchTests,
    type BatchTestItem,
    type StudentBatchItem,
    updateBatchAssignments
  } from '$lib/api/batch';

  let { data }: { data: PageData } = $props();

  let searchInput = $state(data.search ?? '');
	let createBatchModalOpen = $state(false);
	let createBatchStep = $state<1 | 2>(1);
	let step2Tab = $state<'tests' | 'students'>('tests');
	let createdBatchId = $state<string | null>(null);
	let editingBatchId = $state<string | null>(null);
	let batchName = $state('');
	let startDate = $state('');
	let startTime = $state('');
	let endDate = $state('');
	let endTime = $state('');
	let maxCapacity = $state('');

	let createBatchError = $state<string | null>(null);
	let createBatchSuccess = $state<string | null>(null);
	let createBatchSubmitting = $state(false);

	function getParsedMaxCapacity(): number | null {
		const n = Number(maxCapacity);
		return Number.isFinite(n) && n > 0 ? n : null;
	}

	function formatDateForBatchApi(value: string): string {
		const [year, month, day] = value.split('-');
		if (!year || !month || !day) return value;
		return `${day}/${month}/${year}`;
	}

	function isCreateBatchReady(): boolean {
		return (
			batchName.trim().length > 0 &&
			startDate.trim().length > 0 &&
			startTime.trim().length > 0 &&
			endDate.trim().length > 0 &&
			endTime.trim().length > 0 &&
			getParsedMaxCapacity() != null
		);
	}

  $effect(() => {
    searchInput = data.search ?? '';
  });

  // Step 2 selection state
  let step2TestsLoading = $state(false);
  let step2TestsLoaded = $state(false);
  let step2TestsError = $state<string | null>(null);
  let step2Tests = $state<BatchTestItem[]>([]);
  let selectedTestIds = $state<string[]>([]);

  let step2StudentsLoading = $state(false);
  let step2Students = $state<BatchStudentItem[]>([]);
  let selectedStudentIds = $state<string[]>([]);
  let step2PrefetchStarted = $state(false);

  function studentLabel(u: BatchStudentItem) {
    const f = u.firstName ?? '';
    const l = u.lastName ?? '';
    const name = `${f} ${l}`.trim();
    const email = u.userProfileId?.email ?? undefined;
    const phone = u.userProfileId?.phone ?? undefined;
    return name || email || phone || 'Student';
  }

  function testLabel(t: BatchTestItem): string {
    if (typeof t.name === 'string') return t.name;
    return t.name?.en || t.name?.hi || 'Untitled test';
  }

  function testStatusLabel(t?: BatchTestItem): string {
    return (t?.status ?? 'PENDING').toUpperCase();
  }

  function isTestSelected(testId: string) {
    return selectedTestIds.includes(testId);
  }

  function toggleTest(testId: string) {
    selectedTestIds = isTestSelected(testId)
      ? selectedTestIds.filter((id) => id !== testId)
      : [...selectedTestIds, testId];
  }

  function isStudentSelected(userId: string) {
    return selectedStudentIds.includes(userId);
  }

  function toggleStudent(userId: string) {
    const alreadySelected = isStudentSelected(userId);
    if (alreadySelected) {
      selectedStudentIds = selectedStudentIds.filter((id) => id !== userId);
      createBatchError = null;
      return;
    }

    // UI enforce max capacity (backend will still validate).
    const parsed = getParsedMaxCapacity();
    if (parsed != null && selectedStudentIds.length >= parsed) {
      createBatchError = `You can select up to ${parsed} students.`;
      return;
    }

    selectedStudentIds = [...selectedStudentIds, userId];
    createBatchError = null;
  }

  async function loadStep2Data() {
    if (!step2TestsLoaded) {
      step2TestsLoading = true;
      try {
        const res = await fetchBatchTests(
          { search: '', page: 1, limit: 50 },
          fetch,
          { token: $authStore.token }
        );
        if (res.success) {
          const payload = res.data?.data;
          step2Tests = Array.isArray(payload)
            ? payload
            : payload?.data ?? payload?.items ?? [];
        } else {
          step2Tests = [];
          step2TestsError = res.message || 'Failed to load tests.';
        }
        step2TestsLoaded = true;
      } catch {
        step2TestsError = 'Failed to load tests.';
        step2Tests = [];
      } finally {
        step2TestsLoading = false;
      }
    }

    step2StudentsLoading = true;
    try {
      const res = await fetchBatchStudents(
        { page: 1, limit: 20 },
        fetch,
        { token: $authStore.token }
      );
      step2Students = res.success && res.data?.data?.data ? res.data.data.data : [];
    } finally {
      step2StudentsLoading = false;
    }
  }

  function prefetchStep2Data() {
    if (step2PrefetchStarted) return;
    step2PrefetchStarted = true;
    void loadStep2Data();
  }

  function toInputDate(value: string): string {
    const [d, m, y] = value.split('/');
    if (!d || !m || !y) return '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  function openEditBatchModal(batch: StudentBatchItem) {
    createBatchModalOpen = true;
    createBatchStep = 1;
    step2Tab = 'tests';
    editingBatchId = batch._id;
    createdBatchId = batch._id;

    batchName = batch.name ?? '';
    startDate = toInputDate(batch.startDate ?? '');
    startTime = batch.startTime ?? '';
    endDate = toInputDate(batch.endDate ?? '');
    endTime = batch.endTime ?? '';
    maxCapacity = '';

    createBatchError = null;
    createBatchSuccess = null;
    createBatchSubmitting = false;
    selectedTestIds = [];
    selectedStudentIds = [];

    prefetchStep2Data();
  }

  onMount(() => {
    if (!data.ssrAuthMissing || typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(AUTH_STORAGE_KEY)?.trim()) return;
    authStore.restore();
    void invalidateAll();
  });

  const debouncedSearchNavigate = debounce((raw: string) => {
    const u = new URL(page.url);
    const t = raw.trim();
    if (t) u.searchParams.set('search', t);
    else u.searchParams.delete('search');
    u.searchParams.set('page', '1');
    goto(`${u.pathname}${u.search}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }, 400);

  function onSearchInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    searchInput = v;
    debouncedSearchNavigate(v);
  }

  function hrefForPage(p: number): string {
    const u = new URL(page.url);
    u.searchParams.set('page', String(p));
    return `${u.pathname}${u.search}`;
  }

	function openCreateBatchModal() {
		// Reset on open so users always start fresh.
		createBatchStep = 1;
		step2Tab = 'tests';
		createdBatchId = null;
		editingBatchId = null;
		batchName = '';
		startDate = '';
		startTime = '';
		endDate = '';
		endTime = '';
		maxCapacity = '';
		createBatchError = null;
		createBatchSuccess = null;
		createBatchSubmitting = false;
		selectedTestIds = [];
		selectedStudentIds = [];
		step2PrefetchStarted = false;
		step2TestsLoaded = false;
		step2Tests = [];
		step2TestsError = null;
		step2Students = [];
		createBatchModalOpen = true;
		prefetchStep2Data();
	}

	async function onFinishCreateBatch() {
		if (!createdBatchId) {
			createBatchError = 'Batch id is missing. Please save details again.';
			return;
		}
		if (selectedTestIds.length === 0) {
			createBatchError = 'Select at least one test.';
			return;
		}
		if (selectedStudentIds.length === 0) {
			createBatchError = 'Select at least one student.';
			return;
		}

		createBatchError = null;
		createBatchSuccess = null;
		createBatchSubmitting = true;
		try {
			const res = await updateBatchAssignments(
				createdBatchId,
				{
					addStudents: selectedStudentIds,
					addTests: selectedTestIds.map((id) => {
            const t = step2Tests.find((x) => x._id === id);
            return {
              id,
              startAt: t?.settings?.startsAt ?? null,
              endAt: t?.settings?.endsAt ?? null,
              status: testStatusLabel(t)
            };
          })
				},
				fetch,
				{ token: $authStore.token }
			);

			if (!res.success) {
				createBatchError = res.message || 'Failed to update batch.';
				return;
			}

			createBatchSuccess = res.data?.message || 'Batch updated successfully.';
			await invalidateAll();
		} catch {
			createBatchError = 'Failed to update batch.';
		} finally {
			createBatchSubmitting = false;
		}
	}

	function closeCreateBatchModal() {
		createBatchModalOpen = false;
		createBatchStep = 1;
		step2Tab = 'tests';
		createdBatchId = null;
		editingBatchId = null;
	}

	async function onCreateBatchClick() {
		if (!isCreateBatchReady()) {
			createBatchError = 'Please fill all fields correctly.';
			return;
		}

		createBatchError = null;
		createBatchSuccess = null;
		createBatchSubmitting = true;
		try {
			if (editingBatchId) {
				createdBatchId = editingBatchId;
				createBatchStep = 2;
				step2Tab = 'tests';
				createBatchSuccess = 'Batch details loaded for editing.';
				prefetchStep2Data();
				return;
			}

			const parsedCapacity = getParsedMaxCapacity();
			if (parsedCapacity == null) {
				createBatchError = 'Maximum capacity is invalid.';
				return;
			}

			const res = await createBatch(
				{
					name: batchName.trim(),
					startDate: formatDateForBatchApi(startDate),
					startTime,
					endDate: formatDateForBatchApi(endDate),
					endTime,
					maxCapacity: parsedCapacity
				},
				fetch,
				{ token: $authStore.token }
			);

			if (!res.success) {
				createBatchError = res.message || 'Could not create batch.';
				return;
			}

			createdBatchId = res.data?.data ?? null;
			createBatchStep = 2;
			step2Tab = 'tests';
			createBatchSuccess = res.data?.message || 'Batch created successfully.';
			prefetchStep2Data();
		} catch {
			createBatchError = 'Could not save batch details. Please try again.';
		} finally {
			createBatchSubmitting = false;
		}
	}
</script>

<svelte:head>
  <title>Batches — Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-8 ">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <label class="w-full max-w-sm sm:max-w-xs">
        <span class="sr-only">Search batches</span>
        <input
          type="search"
          autocomplete="off"
          placeholder="Search batches…"
          class="
            w-full rounded-xl border px-3 py-2.5 text-sm
            border-[var(--sh-exam-card-border)]
            bg-[var(--sh-exam-card-bg)]
            text-[var(--sh-exam-card-title)]
            placeholder:text-[var(--sh-ai-sub)]
            outline-none transition-colors
            focus:border-[var(--sh-exam-card-hover-border)]
            focus:ring-1 focus:ring-[color-mix(in_srgb,var(--sh-exam-card-hover-border)_40%,transparent)]
          "
          value={searchInput}
          oninput={onSearchInput}
        />
      </label>
      <button
        type="button"
        onclick={openCreateBatchModal}
        class="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[var(--cta-cyan-border)] bg-[var(--dash-cta-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--dash-cta-text)] shadow-[var(--cta-cyan-glow)] transition hover:border-[var(--cta-cyan-border-hover)] hover:bg-[var(--dash-cta-hover-bg)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="text-[var(--accent-cta-cyan)]">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        Create Batch
      </button>
    </header>

    {#await data.streamed.batchesData}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each Array(6) as _}
          <div class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5">
            <Skeleton width="w-12" height="h-12" rounded="rounded-xl" className="mb-4" />
            <Skeleton width="w-3/4" height="h-6" className="mb-2" />
            <Skeleton width="w-1/2" height="h-4" />
          </div>
        {/each}
      </div>
    {:then batchesData}
      {@const batches = batchesData?.data ?? []}
      {@const lastPage = batchesData?.lastPage ?? 1}
      {@const currentPage = batchesData?.currentPage ?? 1}
      {@const showPagination = lastPage > 1}

      {#if batches.length === 0}
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
                d="M4 6h16M4 12h10M4 18h16"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <p class="text-sm font-semibold text-[var(--sh-section-title)]">No batches found</p>
          <p class="mt-1 max-w-sm text-xs text-[var(--sh-ai-sub)]">
            Try another search or check back when your institute assigns you to a batch.
          </p>
        </div>
      {:else}
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {#each batches as batch (batch._id)}
            <li class="relative">
              <StudentBatchCard {batch} basePath="/teacher/batch" />
              <button
                type="button"
                class="absolute right-12 top-3 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-exam-card-arrow-color)] transition hover:border-[var(--sh-exam-card-hover-border)]"
                aria-label={`Edit ${batch.name}`}
                title="Edit batch"
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openEditBatchModal(batch);
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </li>
          {/each}
        </ul>

        {#if showPagination}
          <nav
            class="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--sh-exam-card-border)] pt-6"
            aria-label="Pagination"
          >
            {#if currentPage > 1}
              <a
                class="
                  inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm font-medium
                  border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                  text-[var(--sh-exam-card-title)] no-underline
                  transition-colors hover:border-[var(--sh-exam-card-hover-border)]
                "
                href={hrefForPage(currentPage - 1)}>Previous</a
              >
            {:else}
              <span
                class="
                  inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-lg border px-3 text-sm font-medium
                  border-[var(--sh-exam-card-border)] opacity-50
                  text-[var(--sh-ai-sub)]
                ">Previous</span
              >
            {/if}

            <span class="px-2 text-sm text-[var(--sh-ai-sub)]">
              Page <span class="font-medium text-[var(--sh-exam-card-title)]">{currentPage}</span>
              of
              <span class="font-medium text-[var(--sh-exam-card-title)]">{lastPage}</span>
            </span>

            {#if currentPage < lastPage}
              <a
                class="
                  inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm font-medium
                  border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                  text-[var(--sh-exam-card-title)] no-underline
                  transition-colors hover:border-[var(--sh-exam-card-hover-border)]
                "
                href={hrefForPage(currentPage + 1)}>Next</a
              >
            {:else}
              <span
                class="
                  inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-lg border px-3 text-sm font-medium
                  border-[var(--sh-exam-card-border)] opacity-50
                  text-[var(--sh-ai-sub)]
                ">Next</span
              >
            {/if}
          </nav>
        {/if}
      {/if}
    {/await}
  </div>
</div>

{#if createBatchModalOpen}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label="Create batch"
    onclick={(e) => e.target === e.currentTarget && closeCreateBatchModal()}
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 class="text-lg font-bold text-[var(--sh-section-title)]">{editingBatchId ? 'Edit Batch' : 'Create Batch'}</h2>

      {#if createBatchStep === 1}
        <form
          class="mt-4 grid grid-cols-1 gap-3"
          onsubmit={(e) => {
            e.preventDefault();
            void onCreateBatchClick();
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

        {#if createBatchError}
          <p class="mt-1 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">
            {createBatchError}
          </p>
        {/if}

        {#if createBatchSuccess}
          <p class="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            {createBatchSuccess}
          </p>
        {/if}

        <div class="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]"
            onclick={closeCreateBatchModal}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isCreateBatchReady() || createBatchSubmitting}
          >
            {createBatchSubmitting ? 'Saving…' : (editingBatchId ? 'Edit details' : 'Save details')}
          </button>
        </div>
        </form>
      {:else}
        <div class="mt-4">
          <div class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Step 2: Assign tests & students</p>
            <p class="mt-1 text-sm font-bold text-[var(--page-text)]">{batchName || '—'}</p>
            <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
              Capacity: <span class="font-bold text-[var(--page-text)]">{getParsedMaxCapacity() ?? '—'}</span> students
            </p>
          </div>

          <div class="mt-4">
            <div class="flex gap-2">
              <button
                type="button"
                class={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition
                  ${step2Tab === 'tests' ? 'border-[var(--cta-pink-border-hover)] bg-[color-mix(in_srgb,var(--accent-cta-pink)_14%,var(--sh-exam-card-bg))] text-[var(--page-text)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] hover:border-[var(--sh-exam-card-hover-border)]'}`}
                onclick={() => (step2Tab = 'tests')}
              >
                Tests
              </button>
              <button
                type="button"
                class={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition
                  ${step2Tab === 'students' ? 'border-[color-mix(in_srgb,var(--whatsapp-brand)_60%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,var(--sh-exam-card-bg))] text-[var(--page-text)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] hover:border-[var(--sh-exam-card-hover-border)]'}`}
                onclick={() => (step2Tab = 'students')}
              >
                Students
              </button>
            </div>

            <div class="mt-4">
              {#if step2Tab === 'tests'}
                <section class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3" aria-label="Select tests">
                  <h3 class="text-sm font-bold text-[var(--page-text)]">Tests</h3>
                  <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">Select tests to include in this batch</p>

                  {#if step2TestsLoading}
                    <div class="mt-3 space-y-2">
                      {#each Array(6) as _}
                        <div class="flex items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-2">
                          <div class="h-5 w-10 rounded-full bg-[var(--page-card-border)] opacity-20" />
                          <Skeleton width="w-28" height="h-3" />
                        </div>
                      {/each}
                    </div>
                  {:else if step2TestsError}
                    <p class="mt-3 text-xs text-semantic-error">{step2TestsError}</p>
                  {:else}
                    <ul class="mt-3 max-h-48 space-y-2 overflow-auto pr-1" role="list">
                      {#each step2Tests.slice(0, 20) as t (t._id)}
                        <li>
                          <button
                            type="button"
                            class="w-full rounded-xl border px-3 py-2 text-sm transition-colors
                              border-[var(--sh-exam-card-border)]
                              bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_90%,transparent)]
                              hover:border-[var(--sh-exam-card-hover-border)]"
                            onclick={() => toggleTest(t._id)}
                          >
                            <div class="flex items-center justify-between gap-3">
                              <span class="min-w-0 flex-1 truncate font-semibold text-[var(--page-text)]">
                                {testLabel(t)}
                              </span>
                              <span class="rounded-full border border-[var(--sh-exam-card-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sh-ai-sub)]">
                                {testStatusLabel(t)}
                              </span>
                              <span
                                class="shrink-0 inline-flex h-5 w-10 items-center justify-center rounded-full text-xs font-bold
                                  {isTestSelected(t._id) ? 'bg-[var(--accent-cta-cyan)] text-white' : 'bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] border border-[var(--sh-exam-card-border)]'}"
                                aria-hidden="true"
                              >
                                {isTestSelected(t._id) ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </button>
                        </li>
                      {/each}
                      {#if step2Tests.length === 0}
                        <li class="text-xs text-[var(--sh-ai-sub)]">No tests loaded.</li>
                      {/if}
                    </ul>
                  {/if}

                  <p class="mt-3 text-xs text-[var(--sh-ai-sub)]">
                    Selected tests: <span class="font-bold text-[var(--page-text)]">{selectedTestIds.length}</span>
                  </p>
                </section>
              {:else}
                <section class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3" aria-label="Select students">
                  <h3 class="text-sm font-bold text-[var(--page-text)]">Students</h3>
                  <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
                    Select up to {getParsedMaxCapacity() ?? '—'}
                  </p>

                  {#if step2StudentsLoading}
                    <div class="mt-3 space-y-2">
                      {#each Array(7) as _}
                        <div class="flex items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-2">
                          <div class="h-5 w-10 rounded-full bg-[var(--page-card-border)] opacity-20" />
                          <Skeleton width="w-28" height="h-3" />
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <ul class="mt-3 max-h-48 space-y-2 overflow-auto pr-1" role="list">
                      {#each step2Students as u (u._id)}
                        <li>
                          <button
                            type="button"
                            class="w-full rounded-xl border px-3 py-2 text-sm transition-colors
                              border-[var(--sh-exam-card-border)]
                              bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_90%,transparent)]
                              hover:border-[var(--sh-exam-card-hover-border)]"
                            onclick={() => toggleStudent(u._id)}
                          >
                            <div class="flex items-center justify-between gap-3">
                              <span class="min-w-0 flex-1 truncate font-semibold text-[var(--page-text)]">
                                {studentLabel(u)}
                              </span>
                              <span
                                class="shrink-0 inline-flex h-5 w-10 items-center justify-center rounded-full text-xs font-bold
                                  {isStudentSelected(u._id) ? 'bg-[var(--whatsapp-brand)] text-white' : 'bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] border border-[var(--sh-exam-card-border)]'}"
                                aria-hidden="true"
                              >
                                {isStudentSelected(u._id) ? 'ON' : 'OFF'}
                              </span>
                            </div>
                          </button>
                        </li>
                      {/each}
                      {#if step2Students.length === 0}
                        <li class="text-xs text-[var(--sh-ai-sub)]">No students found.</li>
                      {/if}
                    </ul>
                  {/if}

                  <p class="mt-3 text-xs text-[var(--sh-ai-sub)]">
                    Selected students: <span class="font-bold text-[var(--page-text)]">{selectedStudentIds.length}</span>
                  </p>
                </section>
              {/if}
            </div>
          </div>

          {#if createBatchError}
            <p class="mt-3 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">
              {createBatchError}
            </p>
          {/if}

          {#if createBatchSuccess}
            <p class="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              {createBatchSuccess}
            </p>
          {/if}

          <div class="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]"
              onclick={() => {
                createBatchStep = 1;
                createBatchError = null;
              }}
            >
              Back
            </button>
            <button
              type="button"
              class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={selectedTestIds.length === 0 || selectedStudentIds.length === 0}
              onclick={onFinishCreateBatch}
            >
              Continue
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
