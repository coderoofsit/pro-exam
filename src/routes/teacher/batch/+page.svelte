<script lang="ts">
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import StudentBatchCard from '$lib/components/StudentBatchCard.svelte';
  import BatchSetupModal from '$lib/components/BatchSetupModal.svelte';
  import { debounce } from '$lib/utils/debounce';
  import type { PageData } from './$types';
  import { fetchBatchStudents, type BatchStudentItem } from '$lib/api/teacher';
  import {
    createBatch,
    fetchBatchTests,
    type BatchTestItem,
    type CreateBatchBody,
    type StudentBatchItem,
    updateBatchDetails,
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
	let editingBatchOriginal = $state<{
		name: string;
		startDate: string;
		startTime: string;
		endDate: string;
		endTime: string;
		maxCapacity: number | null;
	} | null>(null);

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
			endTime.trim().length > 0
		);
	}

  $effect(() => {
    searchInput = data.search ?? '';
  });

  // Step 2 selection state
  let step2TestsLoading = $state(false);
  let step2TestsLoadingMore = $state(false);
  let step2TestsLoaded = $state(false);
  let step2TestsError = $state<string | null>(null);
  let step2Tests = $state<BatchTestItem[]>([]);
  let step2TestsPage = $state(1);
  let step2TestsLastPage = $state(1);
  let selectedTestIds = $state<string[]>([]);

  let step2StudentsLoading = $state(false);
  let step2StudentsLoadingMore = $state(false);
  let step2Students = $state<BatchStudentItem[]>([]);
  let step2StudentsPage = $state(1);
  let step2StudentsLastPage = $state(1);
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
  function toggleAllTests(checked: boolean) {
    const visibleIds = step2Tests.map((t) => t._id);
    selectedTestIds = checked
      ? Array.from(new Set([...selectedTestIds, ...visibleIds]))
      : selectedTestIds.filter((id) => !visibleIds.includes(id));
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

    selectedStudentIds = [...selectedStudentIds, userId];
    createBatchError = null;
  }
  function toggleAllStudents(checked: boolean) {
    const visibleIds = step2Students.map((u) => u._id);
    if (checked) {
      const merged = Array.from(new Set([...selectedStudentIds, ...visibleIds]));
      selectedStudentIds = merged;
      return;
    }
    selectedStudentIds = selectedStudentIds.filter((id) => !visibleIds.includes(id));
  }

  async function loadStep2Data() {
    if (!step2TestsLoaded) {
      step2TestsLoading = true;
      try {
        const res = await fetchBatchTests(
          { search: '', page: 1, limit: 20 },
          fetch,
          { token: $authStore.token }
        );
        if (res.success) {
          const payload = res.data?.data;
          const items = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];
          step2Tests = items;
          step2TestsPage = Array.isArray(payload) ? 1 : (payload?.currentPage ?? 1);
          step2TestsLastPage = Array.isArray(payload) ? 1 : (payload?.lastPage ?? 1);
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
      if (res.success && res.data?.data?.data) {
        step2Students = res.data.data.data;
        step2StudentsPage = res.data.data.currentPage ?? 1;
        step2StudentsLastPage = res.data.data.lastPage ?? 1;
      } else {
        step2Students = [];
        step2StudentsPage = 1;
        step2StudentsLastPage = 1;
      }
    } finally {
      step2StudentsLoading = false;
    }
  }

  async function loadMoreStep2Tests() {
    if (step2TestsLoading || step2TestsLoadingMore || step2TestsPage >= step2TestsLastPage) return;
    step2TestsLoadingMore = true;
    try {
      const nextPage = step2TestsPage + 1;
      const res = await fetchBatchTests({ search: '', page: nextPage, limit: 20 }, fetch, { token: $authStore.token });
      if (!res.success) return;
      const payload = res.data?.data;
      const items = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? [];
      const mergedTests = [...step2Tests, ...items];
      step2Tests = [...mergedTests];
      step2TestsPage = Array.isArray(payload) ? nextPage : (payload?.currentPage ?? nextPage);
      step2TestsLastPage = Array.isArray(payload) ? nextPage : (payload?.lastPage ?? nextPage);
    } finally {
      step2TestsLoadingMore = false;
    }
  }

  async function loadMoreStep2Students() {
    if (step2StudentsLoading || step2StudentsLoadingMore || step2StudentsPage >= step2StudentsLastPage) return;
    step2StudentsLoadingMore = true;
    try {
      const nextPage = step2StudentsPage + 1;
      const res = await fetchBatchStudents({ page: nextPage, limit: 20 }, fetch, { token: $authStore.token });
      if (!res.success || !res.data?.data?.data) return;
      const nextStudents = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      const mergedStudents = [...step2Students, ...nextStudents];
step2Students = [...mergedStudents];
      step2StudentsPage = res.data.data.currentPage ?? nextPage;
      step2StudentsLastPage = res.data.data.lastPage ?? nextPage;
    } finally {
      step2StudentsLoadingMore = false;
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
    maxCapacity = String(batch.maxCapacity ?? '');
    editingBatchOriginal = {
      name: batch.name ?? '',
      startDate: batch.startDate ?? '',
      startTime: batch.startTime ?? '',
      endDate: batch.endDate ?? '',
      endTime: batch.endTime ?? '',
      maxCapacity: batch.maxCapacity ?? null
    };

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
		editingBatchOriginal = null;
		createBatchError = null;
		createBatchSuccess = null;
		createBatchSubmitting = false;
		selectedTestIds = [];
		selectedStudentIds = [];
		step2PrefetchStarted = false;
		step2TestsLoaded = false;
		step2Tests = [];
		step2TestsPage = 1;
		step2TestsLastPage = 1;
		step2TestsError = null;
		step2Students = [];
		step2StudentsPage = 1;
		step2StudentsLastPage = 1;
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
			closeCreateBatchModal();
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
		editingBatchOriginal = null;
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
				const currentName = batchName.trim();
				const currentStartDate = formatDateForBatchApi(startDate);
				const currentEndDate = formatDateForBatchApi(endDate);
				const parsedCapacity = getParsedMaxCapacity();
				const original = editingBatchOriginal;
				const patch: Partial<CreateBatchBody> = {};
				if (original && currentName !== original.name) patch.name = currentName;
				if (original && currentStartDate !== original.startDate) patch.startDate = currentStartDate;
				if (original && startTime !== original.startTime) patch.startTime = startTime;
				if (original && currentEndDate !== original.endDate) patch.endDate = currentEndDate;
				if (original && endTime !== original.endTime) patch.endTime = endTime;
				if (parsedCapacity != null && parsedCapacity !== (original?.maxCapacity ?? null)) {
					patch.maxCapacity = parsedCapacity;
				}
				if (Object.keys(patch).length > 0) {
					const updateRes = await updateBatchDetails(
						editingBatchId,
						patch,
						fetch,
						{ token: $authStore.token }
					);
					if (!updateRes.success) {
						createBatchError = updateRes.message || 'Could not update batch details.';
						return;
					}
				}
				createdBatchId = editingBatchId;
				createBatchStep = 2;
				step2Tab = 'tests';
				prefetchStep2Data();
				return;
			}

			const parsedCapacity = getParsedMaxCapacity();
			const basePayload = {
				name: batchName.trim(),
				startDate: formatDateForBatchApi(startDate),
				startTime,
				endDate: formatDateForBatchApi(endDate),
				endTime
			};
			const payload: CreateBatchBody =
				parsedCapacity != null
					? { ...basePayload, maxCapacity: parsedCapacity }
					: ({ ...basePayload } as CreateBatchBody);

			const res = await createBatch(
				payload,
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

<div
  class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300"
  style="font-family: 'Segoe UI', Inter, Poppins, system-ui, -apple-system, sans-serif;"
>
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

<BatchSetupModal
  open={createBatchModalOpen}
  modeLabel={editingBatchId ? 'Edit' : 'Create'}
  step={createBatchStep}
  tab={step2Tab}
  bind:batchName
  bind:startDate
  bind:startTime
  bind:endDate
  bind:endTime
  bind:maxCapacity
  parsedCapacity={getParsedMaxCapacity()}
  error={createBatchError}
  success={createBatchSuccess}
  submitting={createBatchSubmitting}
  testsLoading={step2TestsLoading}
  testsLoadingMore={step2TestsLoadingMore}
  testsHasMore={step2TestsPage < step2TestsLastPage}
  testsError={step2TestsError}
  tests={step2Tests}
  selectedTestIds={selectedTestIds}
  studentsLoading={step2StudentsLoading}
  studentsLoadingMore={step2StudentsLoadingMore}
  studentsHasMore={step2StudentsPage < step2StudentsLastPage}
  students={step2Students}
  selectedStudentIds={selectedStudentIds}
  onClose={closeCreateBatchModal}
  onSubmitStep1={() => void onCreateBatchClick()}
  onBack={() => {
    createBatchStep = 1;
    createBatchError = null;
  }}
  onContinue={() => void onFinishCreateBatch()}
  onSwitchTab={(tab) => (step2Tab = tab)}
  onToggleTest={toggleTest}
  onToggleStudent={toggleStudent}
  onToggleAllTests={toggleAllTests}
  onToggleAllStudents={toggleAllStudents}
  onLoadMoreTests={() => void loadMoreStep2Tests()}
  onLoadMoreStudents={() => void loadMoreStep2Students()}
  isReady={isCreateBatchReady}
  {testLabel}
  {testStatusLabel}
  {studentLabel}
  isTestSelected={isTestSelected}
  isStudentSelected={isStudentSelected}
/>
