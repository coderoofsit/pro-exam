<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { fetchBatchStudents, type BatchStudentItem } from '$lib/api/teacher';
	import {
		fetchBatchTests,
		updateBatchAssignments,
		type BatchTestItem
	} from '$lib/api/batch';
	import Pagination from '$lib/components/Pagination.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let searchInput = $state('');
	let activeTab = $state<'teacher' | 'student' | 'test'>('teacher');
	let teachersData = $state<any[]>([]);
	let studentsData = $state<any[]>([]);
	let testsData = $state<any[]>([]);
	let teacherCurrentPage = $state(1);
	let teacherTotalPages = $state(1);
	let studentCurrentPage = $state(1);
	let studentTotalPages = $state(1);
	let testCurrentPage = $state(1);
	let testTotalPages = $state(1);
	let selectedTeacherIds = $state<string[]>([]);
	let selectedStudentIds = $state<string[]>([]);
	let selectedTestIds = $state<string[]>([]);
	let batchId = $state('');
	let removeConfirmOpen = $state(false);
	let allowRemoveSubmit = $state(false);
	let removeLoading = $state(false);
	let removeFormEl: HTMLFormElement | null = null;
	let batchName = $state('');
	let batchInfo = $state<any>(null);
	let editBatchModalOpen = $state(false);
	let editBatchStep = $state<1 | 2>(1);
	let editStep2Tab = $state<'tests' | 'students'>('tests');
	let editBatchName = $state('');
	let editStartDate = $state('');
	let editStartTime = $state('');
	let editEndDate = $state('');
	let editEndTime = $state('');
	let editMaxCapacity = $state('');
	let editBatchError = $state<string | null>(null);
	let editBatchSuccess = $state<string | null>(null);
	let editSubmitting = $state(false);
	let editTestsLoading = $state(false);
	let editTestsLoaded = $state(false);
	let editTestsError = $state<string | null>(null);
	let editTests = $state<BatchTestItem[]>([]);
	let editSelectedTestIds = $state<string[]>([]);
	let editStudentsLoading = $state(false);
	let editStudents = $state<BatchStudentItem[]>([]);
	let editSelectedStudentIds = $state<string[]>([]);
	let editPrefetchStarted = $state(false);

	$effect(() => {
		if (typeof data?.ssrAuthMissing !== 'boolean') return;
		loading = !data.ssrAuthMissing;
	});

	$effect(() => {
		errorMessage = data?.actionError ?? null;
	});

	$effect(() => {
		searchInput = (page.url.searchParams.get('search') ?? '').trim();
	});

	$effect(() => {
		const tab = (page.url.searchParams.get('tab') ?? 'teacher').trim();
		if (tab === 'student' || tab === 'test' || tab === 'teacher') {
			activeTab = tab;
			return;
		}
		activeTab = 'teacher';
	});

	$effect(() => {
		const p = data?.streamed?.teachersData;
		if (!p || typeof (p as any).then !== 'function') return;

		loading = true;
		void p.then((payload: any) => {
			if (!payload) {
				loading = false;
				return;
			}
			teachersData = payload.teachers?.data ?? [];
			studentsData = payload.students?.data ?? [];
			testsData = payload.tests?.data ?? [];
			teacherCurrentPage = payload.teachers?.currentPage ?? 1;
			teacherTotalPages = payload.teachers?.lastPage ?? 1;
			studentCurrentPage = payload.students?.currentPage ?? 1;
			studentTotalPages = payload.students?.lastPage ?? 1;
			testCurrentPage = payload.tests?.currentPage ?? 1;
			testTotalPages = payload.tests?.lastPage ?? 1;
			batchId = payload.batch?.id ?? '';
			batchName = payload.batch?.name ?? '';
			batchInfo = payload.batch ?? null;
			selectedTeacherIds = [];
			selectedStudentIds = [];
			selectedTestIds = [];
			loading = false;
		});
	});

	const currentPage = $derived(
		activeTab === 'teacher'
			? teacherCurrentPage
			: activeTab === 'student'
				? studentCurrentPage
				: testCurrentPage
	);
	const totalPages = $derived(
		activeTab === 'teacher'
			? teacherTotalPages
			: activeTab === 'student'
				? studentTotalPages
				: testTotalPages
	);

	const activeRows = $derived(
		activeTab === 'teacher'
			? teachersData
			: activeTab === 'student'
				? studentsData
				: testsData
	);

	const searchPlaceholder = $derived(
		activeTab === 'test' ? 'Search by test name' : 'Search by name or email'
	);

	function pageParamForTab(tab: 'teacher' | 'student' | 'test') {
		if (tab === 'teacher') return 'teacherPage';
		if (tab === 'student') return 'studentPage';
		return 'testPage';
	}

	function hrefForPage(p: number): string {
		const u = new URL(page.url);
		u.searchParams.set(pageParamForTab(activeTab), String(p));
		u.searchParams.set('tab', activeTab);
		return `${u.pathname}${u.search}`;
	}

	async function applySearch(query?: string) {
		const u = new URL(page.url);
		const v = (query ?? searchInput).trim();
		if (v) u.searchParams.set('search', v);
		else u.searchParams.delete('search');
		u.searchParams.set(pageParamForTab(activeTab), '1');
		u.searchParams.set('tab', activeTab);
		await goto(`${u.pathname}${u.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	const SEARCH_DEBOUNCE_MS = 1000;

	$effect(() => {
		const currentSearch = (page.url.searchParams.get('search') ?? '').trim();
		const nextSearch = searchInput.trim();
		if (nextSearch === currentSearch) return;

		const t = setTimeout(() => {
			void applySearch(nextSearch);
		}, SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(t);
	});

	async function switchTab(tab: 'teacher' | 'student' | 'test') {
		const u = new URL(page.url);
		u.searchParams.set('tab', tab);
		await goto(`${u.pathname}${u.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function testName(t: any) {
		if (typeof t?.name === 'string') return t.name;
		return t?.name?.en || t?.name?.hi || 'Untitled test';
	}

	const totalSelectedCount = $derived(
		selectedTeacherIds.length + selectedStudentIds.length + selectedTestIds.length
	);

	const visibleTeacherIds = $derived(
		teachersData.map((t) => String(t.userId ?? '')).filter(Boolean)
	);
	const visibleStudentIds = $derived(
		studentsData.map((s) => String(s.userId ?? '')).filter(Boolean)
	);
	const visibleTestIds = $derived(
		testsData.map((t) => String(t.testId ?? '')).filter(Boolean)
	);

	const allVisibleTeachersSelected = $derived(
		visibleTeacherIds.length > 0 &&
			visibleTeacherIds.every((id) => selectedTeacherIds.includes(id))
	);
	const allVisibleStudentsSelected = $derived(
		visibleStudentIds.length > 0 &&
			visibleStudentIds.every((id) => selectedStudentIds.includes(id))
	);
	const allVisibleTestsSelected = $derived(
		visibleTestIds.length > 0 &&
			visibleTestIds.every((id) => selectedTestIds.includes(id))
	);

	function toggleSelectedId(
		type: 'teacher' | 'student' | 'test',
		id: string,
		checked: boolean
	) {
		if (!id) return;
		if (type === 'teacher') {
			selectedTeacherIds = checked
				? selectedTeacherIds.includes(id)
					? selectedTeacherIds
					: [...selectedTeacherIds, id]
				: selectedTeacherIds.filter((x) => x !== id);
			return;
		}
		if (type === 'student') {
			selectedStudentIds = checked
				? selectedStudentIds.includes(id)
					? selectedStudentIds
					: [...selectedStudentIds, id]
				: selectedStudentIds.filter((x) => x !== id);
			return;
		}
		selectedTestIds = checked
			? selectedTestIds.includes(id)
				? selectedTestIds
				: [...selectedTestIds, id]
			: selectedTestIds.filter((x) => x !== id);
	}

	function toggleSelectAll(type: 'teacher' | 'student' | 'test', checked: boolean) {
		if (type === 'teacher') {
			selectedTeacherIds = checked
				? Array.from(new Set([...selectedTeacherIds, ...visibleTeacherIds]))
				: selectedTeacherIds.filter((id) => !visibleTeacherIds.includes(id));
			return;
		}
		if (type === 'student') {
			selectedStudentIds = checked
				? Array.from(new Set([...selectedStudentIds, ...visibleStudentIds]))
				: selectedStudentIds.filter((id) => !visibleStudentIds.includes(id));
			return;
		}
		selectedTestIds = checked
			? Array.from(new Set([...selectedTestIds, ...visibleTestIds]))
			: selectedTestIds.filter((id) => !visibleTestIds.includes(id));
	}

	const selectedTeachersList = $derived(
		teachersData.filter((t) => selectedTeacherIds.includes(String(t.userId ?? '')))
	);
	const selectedStudentsList = $derived(
		studentsData.filter((s) => selectedStudentIds.includes(String(s.userId ?? '')))
	);
	const selectedTestsList = $derived(
		testsData.filter((t) => selectedTestIds.includes(String(t.testId ?? '')))
	);

	function itemDisplayName(item: any) {
		return (item?.name ?? `${item?.firstName ?? ''} ${item?.lastName ?? ''}`.trim()) || '—';
	}

	function removeSelectedItem(type: 'teacher' | 'student' | 'test', id: string) {
		if (!id) return;
		if (type === 'teacher') {
			selectedTeacherIds = selectedTeacherIds.filter((x) => x !== id);
			return;
		}
		if (type === 'student') {
			selectedStudentIds = selectedStudentIds.filter((x) => x !== id);
			return;
		}
		selectedTestIds = selectedTestIds.filter((x) => x !== id);
	}

	function toInputDate(value: string): string {
		const [d, m, y] = value.split('/');
		if (!d || !m || !y) return '';
		return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
	}

	function getParsedEditCapacity(): number | null {
		const n = Number(editMaxCapacity);
		return Number.isFinite(n) && n > 0 ? n : null;
	}

	function testLabel(t: BatchTestItem): string {
		if (typeof t.name === 'string') return t.name;
		return t.name?.en || t.name?.hi || 'Untitled test';
	}

	function studentLabel(u: BatchStudentItem) {
		const f = u.firstName ?? '';
		const l = u.lastName ?? '';
		const name = `${f} ${l}`.trim();
		const email = u.userProfileId?.email ?? undefined;
		const phone = u.userProfileId?.phone ?? undefined;
		return name || email || phone || 'Student';
	}

	function testStatusLabel(t?: BatchTestItem): string {
		return (t?.status ?? 'PENDING').toUpperCase();
	}

	function isEditTestSelected(testId: string) {
		return editSelectedTestIds.includes(testId);
	}

	function toggleEditTest(testId: string) {
		editSelectedTestIds = isEditTestSelected(testId)
			? editSelectedTestIds.filter((id) => id !== testId)
			: [...editSelectedTestIds, testId];
	}

	function isEditStudentSelected(userId: string) {
		return editSelectedStudentIds.includes(userId);
	}

	function toggleEditStudent(userId: string) {
		const alreadySelected = isEditStudentSelected(userId);
		if (alreadySelected) {
			editSelectedStudentIds = editSelectedStudentIds.filter((id) => id !== userId);
			editBatchError = null;
			return;
		}
		const parsed = getParsedEditCapacity();
		if (parsed != null && editSelectedStudentIds.length >= parsed) {
			editBatchError = `You can select up to ${parsed} students.`;
			return;
		}
		editSelectedStudentIds = [...editSelectedStudentIds, userId];
		editBatchError = null;
	}

	async function loadEditStep2Data() {
		if (!editTestsLoaded) {
			editTestsLoading = true;
			try {
				const res = await fetchBatchTests({ search: '', page: 1, limit: 50 }, fetch);
				if (res.success) {
					const payload = res.data?.data;
					editTests = Array.isArray(payload)
						? payload
						: payload?.data ?? payload?.items ?? [];
				} else {
					editTests = [];
					editTestsError = res.message || 'Failed to load tests.';
				}
				editTestsLoaded = true;
			} catch {
				editTestsError = 'Failed to load tests.';
				editTests = [];
			} finally {
				editTestsLoading = false;
			}
		}

		editStudentsLoading = true;
		try {
			const res = await fetchBatchStudents({ page: 1, limit: 20 }, fetch);
			editStudents = res.success && res.data?.data?.data ? res.data.data.data : [];
		} finally {
			editStudentsLoading = false;
		}
	}

	function prefetchEditStep2Data() {
		if (editPrefetchStarted) return;
		editPrefetchStarted = true;
		void loadEditStep2Data();
	}

	function openEditBatchModal() {
		editBatchModalOpen = true;
		editBatchStep = 1;
		editStep2Tab = 'tests';
		editBatchName = batchInfo?.name ?? batchName ?? '';
		editStartDate = toInputDate(batchInfo?.startDate ?? '');
		editStartTime = batchInfo?.startTime ?? '';
		editEndDate = toInputDate(batchInfo?.endDate ?? '');
		editEndTime = batchInfo?.endTime ?? '';
		editMaxCapacity = String(batchInfo?.maxCapacity ?? '');
		editBatchError = null;
		editBatchSuccess = null;
		editSubmitting = false;
		editSelectedTestIds = [];
		editSelectedStudentIds = [];
		editPrefetchStarted = false;
		editTestsLoaded = false;
		editTests = [];
		editTestsError = null;
		editStudents = [];
		prefetchEditStep2Data();
	}

	function closeEditBatchModal() {
		editBatchModalOpen = false;
		editBatchStep = 1;
		editStep2Tab = 'tests';
	}

	function isEditBatchReady(): boolean {
		return (
			editBatchName.trim().length > 0 &&
			editStartDate.trim().length > 0 &&
			editStartTime.trim().length > 0 &&
			editEndDate.trim().length > 0 &&
			editEndTime.trim().length > 0 &&
			getParsedEditCapacity() != null
		);
	}

	async function onEditBatchStep1Continue() {
		if (!isEditBatchReady()) {
			editBatchError = 'Please fill all fields correctly.';
			return;
		}
		editBatchError = null;
		editBatchSuccess = 'Batch details are ready.';
		editBatchStep = 2;
		editStep2Tab = 'tests';
		prefetchEditStep2Data();
	}

	async function onFinishEditBatch() {
		if (!batchId) {
			editBatchError = 'Batch id is missing.';
			return;
		}
		if (editSelectedTestIds.length === 0) {
			editBatchError = 'Select at least one test.';
			return;
		}
		if (editSelectedStudentIds.length === 0) {
			editBatchError = 'Select at least one student.';
			return;
		}

		editBatchError = null;
		editBatchSuccess = null;
		editSubmitting = true;
		try {
			const res = await updateBatchAssignments(
				batchId,
				{
					addStudents: editSelectedStudentIds,
					addTests: editSelectedTestIds.map((id) => {
						const t = editTests.find((x) => x._id === id);
						return {
							id,
							startAt: t?.settings?.startsAt ?? null,
							endAt: t?.settings?.endsAt ?? null,
							status: testStatusLabel(t)
						};
					})
				},
				fetch
			);

			if (!res.success) {
				editBatchError = res.message || 'Failed to update batch.';
				return;
			}

			editBatchSuccess = res.data?.message || 'Batch updated successfully.';
			await invalidateAll();
			closeEditBatchModal();
		} catch {
			editBatchError = 'Failed to update batch.';
		} finally {
			editSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{batchName ? `${batchName} — Batch Items` : 'Batch Items'} — Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
	<div class="mx-auto max-w-6xl px-4 py-6">
		<header class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
			<div class="min-w-0 sm:justify-self-start">
				<div class="flex items-center justify-between gap-3">
					<h1 class="text-2xl font-bold text-[var(--page-text)]">
						{batchName || 'Batch'} Details
					</h1>
					<button
						type="button"
						class="inline-flex items-center gap-2 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm font-semibold text-[var(--page-text)] transition-colors hover:border-[var(--sh-exam-card-hover-border)]"
						onclick={openEditBatchModal}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Edit
					</button>
				</div>
			</div>
			<div class="flex justify-center sm:justify-self-center">
				{#if !loading && totalPages > 1}
					<Pagination
						{currentPage}
						{totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix="teacher-batch-teachers-top"
					/>
				{/if}
			</div>
		</header>

		{#if errorMessage}
			<div
				class="mb-4 rounded-2xl border border-semantic-error/60 bg-[color-mix(in_srgb,rgba(239,68,68,0.1),transparent)] p-4 text-sm text-semantic-error"
			>
				{errorMessage}
			</div>
		{/if}

		{#if batchInfo}
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
					<div class="text-xs text-[var(--page-text-muted)]">Status</div>
					<div class="mt-1 text-sm font-semibold text-[var(--page-text)]">
						{batchInfo.status || '—'}
					</div>
				</div>
				<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
					<div class="text-xs text-[var(--page-text-muted)]">Schedule</div>
					<div class="mt-1 text-sm font-semibold text-[var(--page-text)]">
						{batchInfo.startDate || '—'} {batchInfo.startTime || ''}
					</div>
					<div class="text-xs text-[var(--page-text-muted)]">
						to {batchInfo.endDate || '—'} {batchInfo.endTime || ''}
					</div>
				</div>
				<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
					<div class="text-xs text-[var(--page-text-muted)]">Capacity</div>
					<div class="mt-1 text-sm font-semibold text-[var(--page-text)]">
						{batchInfo.maxCapacity ?? 0}
					</div>
				</div>
				<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
					<div class="text-xs text-[var(--page-text-muted)]">Counts</div>
					<div class="mt-1 text-sm font-semibold text-[var(--page-text)]">
						S: {batchInfo.numberOfStudents ?? 0} · T: {batchInfo.numberOfTeachers ?? 0} · X: {batchInfo.numberOfTests ?? 0}
					</div>
				</div>
			</div>
		{/if}

		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="inline-flex rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-1">
				<button
					type="button"
					class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
						activeTab === 'teacher'
							? 'bg-[var(--sh-exam-card-arrow-bg)] text-[var(--page-text)]'
							: 'text-[var(--page-text-muted)]'
					}`}
					onclick={() => void switchTab('teacher')}
				>
					Teachers
				</button>
				<button
					type="button"
					class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
						activeTab === 'student'
							? 'bg-[var(--sh-exam-card-arrow-bg)] text-[var(--page-text)]'
							: 'text-[var(--page-text-muted)]'
					}`}
					onclick={() => void switchTab('student')}
				>
					Students
				</button>
				<button
					type="button"
					class={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
						activeTab === 'test'
							? 'bg-[var(--sh-exam-card-arrow-bg)] text-[var(--page-text)]'
							: 'text-[var(--page-text-muted)]'
					}`}
					onclick={() => void switchTab('test')}
				>
					Tests
				</button>
			</div>

			<form
				class="ml-auto flex min-w-[260px] items-center gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					void applySearch();
				}}
			>
				<input
					type="search"
					placeholder={searchPlaceholder}
					class="w-full rounded-xl border px-3 py-2 text-sm border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)]"
					bind:value={searchInput}
				/>
			</form>

			{#if totalSelectedCount > 0}
				<form
					method="POST"
					action="?/removeSelected"
					bind:this={removeFormEl}
					use:enhance={() => {
						return async ({ result }: any) => {
							removeLoading = false;
							if (result.type === 'success') {
								removeConfirmOpen = false;
								selectedTeacherIds = [];
								selectedStudentIds = [];
								selectedTestIds = [];
								const u = new URL(page.url);
								u.searchParams.set('tab', 'teacher');
								await goto(`${u.pathname}${u.search}`, {
									keepFocus: true,
									noScroll: true,
									replaceState: true
								});
								await invalidateAll();
								return;
							}
							errorMessage = result?.data?.message || 'Failed to remove selected items.';
						};
					}}
					onsubmit={(e) => {
						if (!allowRemoveSubmit) {
							e.preventDefault();
							return;
						}
						allowRemoveSubmit = false;
						removeLoading = true;
						errorMessage = null;
					}}
				>
					<input type="hidden" name="batchId" value={batchId} />
					{#each selectedTeacherIds as id (id)}
						<input type="hidden" name="teachers" value={id} />
					{/each}
					{#each selectedStudentIds as id (id)}
						<input type="hidden" name="students" value={id} />
					{/each}
					{#each selectedTestIds as id (id)}
						<input type="hidden" name="tests" value={id} />
					{/each}
					<button
						type="button"
						disabled={removeLoading}
						class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
						onclick={() => {
							removeConfirmOpen = true;
						}}
					>
						{removeLoading ? 'Removing...' : `Remove selected (${totalSelectedCount})`}
					</button>
				</form>
			{/if}
		</div>

		{#if loading}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5">
						<Skeleton width="w-3/4" height="h-5" className="mb-3" />
						<Skeleton width="w-full" height="h-3" className="mb-2" />
						<Skeleton width="w-2/3" height="h-3" className="mb-2" />
						<Skeleton width="w-24" height="h-8" rounded="rounded-xl" />
					</div>
				{/each}
			</div>
		{:else if activeRows.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
			>
				<p class="text-sm font-semibold text-[var(--sh-section-title)]">
					No {activeTab === 'teacher' ? 'teachers' : activeTab === 'student' ? 'students' : 'tests'} found
				</p>
				<p class="mt-1 max-w-md text-xs text-[var(--sh-ai-sub)]">
					This batch currently has no {activeTab === 'teacher'
						? 'teachers'
						: activeTab === 'student'
							? 'students'
							: 'tests'} assigned.
				</p>
			</div>
		{:else}
			<div class="table-wrap bg-[var(--sh-exam-card-bg)]">
				<table class="perf-table">
					<thead>
						<tr>
							{#if activeTab === 'test'}
								<th>
									<div class="flex items-center gap-2">
										<span>Test</span>
										<input
											type="checkbox"
											checked={allVisibleTestsSelected}
											onchange={(e) =>
												toggleSelectAll(
													'test',
													(e.currentTarget as HTMLInputElement).checked
												)}
										/>
									</div>
								</th>
								<th>Schedule</th>
								<th>Status</th>
							{:else}
								<th>
									<div class="flex items-center gap-2">
										<span>{activeTab === 'teacher' ? 'Teacher' : 'Student'}</span>
										<input
											type="checkbox"
											checked={activeTab === 'teacher'
												? allVisibleTeachersSelected
												: allVisibleStudentsSelected}
											onchange={(e) =>
												toggleSelectAll(
													activeTab,
													(e.currentTarget as HTMLInputElement).checked
												)}
										/>
									</div>
								</th>
								<th>Contact</th>
								<th>Status</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#if activeTab === 'test'}
							{#each testsData as t (t.testId)}
								<tr>
									<td>
										<div class="flex items-center gap-3">
											<input
												type="checkbox"
												checked={selectedTestIds.includes(t.testId)}
												onchange={(e) =>
													toggleSelectedId(
														'test',
														t.testId,
														(e.currentTarget as HTMLInputElement).checked
													)}
											/>
											<div class="font-semibold text-[var(--page-text)]">
												{testName(t)}
											</div>
										</div>
										<div class="mt-1 text-xs text-[var(--page-text-muted)]">
											{t.slug ?? '—'}
										</div>
									</td>
									<td>
										<div>
											{t.settings?.startDate ?? '—'} {t.settings?.startTime ?? ''}
										</div>
										<div class="mt-1 text-xs text-[var(--page-text-muted)]">
											{t.settings?.endDate ?? '—'} {t.settings?.endTime ?? ''}
										</div>
									</td>
									<td>
										{#if t.isActive === false}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--semantic-error)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_12%,transparent)] px-3 py-1 text-xs font-semibold text-semantic-error"
												>Inactive</span
											>
										{:else}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]"
												>Active</span
											>
										{/if}
									</td>
								</tr>
							{/each}
						{:else}
							{#each (activeTab === 'teacher' ? teachersData : studentsData) as t (t.userId)}
								<tr>
									<td>
										<div class="flex items-center gap-3">
											<input
												type="checkbox"
												checked={activeTab === 'teacher'
													? selectedTeacherIds.includes(t.userId)
													: selectedStudentIds.includes(t.userId)}
												onchange={(e) =>
													toggleSelectedId(
														activeTab,
														t.userId,
														(e.currentTarget as HTMLInputElement).checked
													)}
											/>
											<div class="font-semibold text-[var(--page-text)]">
												{(t.name ?? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim()) || '—'}
											</div>
										</div>
									</td>
									<td>
										<div>{t.email ? t.email : '—'}</div>
										<div class="mt-1 text-xs text-[var(--page-text-muted)]">
											{t.phone ? t.phone : '—'}
										</div>
									</td>
									<td>
										{#if t.isActive === false}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--semantic-error)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_12%,transparent)] px-3 py-1 text-xs font-semibold text-semantic-error"
												>Inactive</span
											>
										{:else}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]"
												>Active</span
											>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			{#if totalPages > 1}
				<div class="mt-4">
					<Pagination
						{currentPage}
						{totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix="teacher-batch-teachers-bottom"
					/>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if removeConfirmOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && (removeConfirmOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (removeConfirmOpen = false)}
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
		>
			<h2 class="text-lg font-bold text-[var(--sh-section-title)]">Review selected items</h2>
			<p class="mt-2 text-sm text-[var(--sh-ai-sub)]">
				You selected {totalSelectedCount} item(s) for removal.
			</p>

			<div class="mt-4 max-h-[50vh] space-y-4 overflow-auto pr-1">
				{#if selectedTeachersList.length > 0}
					<div>
						<p class="text-sm font-semibold text-[var(--page-text)]">
							Teachers ({selectedTeachersList.length})
						</p>
						<ul class="mt-2 space-y-1 text-sm text-[var(--page-text-muted)]">
							{#each selectedTeachersList as t (t.userId)}
								<li class="flex items-center justify-between gap-3">
									<span>{itemDisplayName(t)}</span>
									<button
										type="button"
										class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] text-xs text-[var(--page-text-muted)] hover:border-[var(--semantic-error)] hover:text-[var(--semantic-error)]"
										aria-label="Remove selected teacher"
										onclick={() => removeSelectedItem('teacher', String(t.userId ?? ''))}
									>
										x
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if selectedStudentsList.length > 0}
					<div>
						<p class="text-sm font-semibold text-[var(--page-text)]">
							Students ({selectedStudentsList.length})
						</p>
						<ul class="mt-2 space-y-1 text-sm text-[var(--page-text-muted)]">
							{#each selectedStudentsList as s (s.userId)}
								<li class="flex items-center justify-between gap-3">
									<span>{itemDisplayName(s)}</span>
									<button
										type="button"
										class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] text-xs text-[var(--page-text-muted)] hover:border-[var(--semantic-error)] hover:text-[var(--semantic-error)]"
										aria-label="Remove selected student"
										onclick={() => removeSelectedItem('student', String(s.userId ?? ''))}
									>
										x
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if selectedTestsList.length > 0}
					<div>
						<p class="text-sm font-semibold text-[var(--page-text)]">
							Tests ({selectedTestsList.length})
						</p>
						<ul class="mt-2 space-y-1 text-sm text-[var(--page-text-muted)]">
							{#each selectedTestsList as t (t.testId)}
								<li class="flex items-center justify-between gap-3">
									<span>{testName(t)}</span>
									<button
										type="button"
										class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] text-xs text-[var(--page-text-muted)] hover:border-[var(--semantic-error)] hover:text-[var(--semantic-error)]"
										aria-label="Remove selected test"
										onclick={() => removeSelectedItem('test', String(t.testId ?? ''))}
									>
										x
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>

			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)]"
					onclick={() => {
						removeConfirmOpen = false;
						allowRemoveSubmit = false;
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
					onclick={() => {
						allowRemoveSubmit = true;
						removeConfirmOpen = false;
						removeFormEl?.requestSubmit();
					}}
				>
					Continue
				</button>
			</div>
		</div>
	</div>
{/if}

{#if editBatchModalOpen}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Edit batch"
		onclick={(e) => e.target === e.currentTarget && closeEditBatchModal()}
	>
		<div
			class="w-full max-w-lg rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="text-lg font-bold text-[var(--sh-section-title)]">Edit Batch</h2>
			{#if editBatchStep === 1}
				<form
					class="mt-4 grid grid-cols-1 gap-3"
					onsubmit={(e) => {
						e.preventDefault();
						void onEditBatchStep1Continue();
					}}
				>
					<label class="block">
						<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
							Batch name
						</span>
						<input type="text" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editBatchName} />
					</label>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label class="block">
							<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Start date</span>
							<input type="date" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editStartDate} />
						</label>
						<label class="block">
							<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Start time</span>
							<input type="time" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editStartTime} />
						</label>
					</div>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label class="block">
							<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">End date</span>
							<input type="date" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editEndDate} />
						</label>
						<label class="block">
							<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">End time</span>
							<input type="time" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editEndTime} />
						</label>
					</div>
					<label class="block">
						<span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Maximum capacity (students)</span>
						<input type="number" min="1" step="1" inputmode="numeric" class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]" bind:value={editMaxCapacity} />
					</label>
					{#if editBatchError}
						<p class="mt-1 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">{editBatchError}</p>
					{/if}
					{#if editBatchSuccess}
						<p class="mt-1 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{editBatchSuccess}</p>
					{/if}
					<div class="mt-2 flex items-center justify-end gap-2">
						<button type="button" class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]" onclick={closeEditBatchModal}>Cancel</button>
						<button type="submit" class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60" disabled={!isEditBatchReady() || editSubmitting}>
							{editSubmitting ? 'Saving…' : 'Edit details'}
						</button>
					</div>
				</form>
			{:else}
				<div class="mt-4">
					<div class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">Step 2: Assign tests & students</p>
						<p class="mt-1 text-sm font-bold text-[var(--page-text)]">{editBatchName || '—'}</p>
						<p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
							Capacity: <span class="font-bold text-[var(--page-text)]">{getParsedEditCapacity() ?? '—'}</span> students
						</p>
					</div>
					<div class="mt-4">
						<div class="flex gap-2">
							<button type="button" class={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${editStep2Tab === 'tests' ? 'border-[var(--cta-pink-border-hover)] bg-[color-mix(in_srgb,var(--accent-cta-pink)_14%,var(--sh-exam-card-bg))] text-[var(--page-text)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] hover:border-[var(--sh-exam-card-hover-border)]'}`} onclick={() => (editStep2Tab = 'tests')}>Tests</button>
							<button type="button" class={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${editStep2Tab === 'students' ? 'border-[color-mix(in_srgb,var(--whatsapp-brand)_60%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,var(--sh-exam-card-bg))] text-[var(--page-text)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] hover:border-[var(--sh-exam-card-hover-border)]'}`} onclick={() => (editStep2Tab = 'students')}>Students</button>
						</div>
						<div class="mt-4">
							{#if editStep2Tab === 'tests'}
								<section class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
									<h3 class="text-sm font-bold text-[var(--page-text)]">Tests</h3>
									{#if editTestsLoading}
										<div class="mt-3 space-y-2">{#each Array(4) as _}<div class="h-8 rounded-xl border border-[var(--sh-exam-card-border)]"></div>{/each}</div>
									{:else}
										<ul class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
											{#each editTests.slice(0, 20) as t (t._id)}
												<li>
													<button type="button" class="w-full rounded-xl border px-3 py-2 text-sm border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_90%,transparent)] hover:border-[var(--sh-exam-card-hover-border)]" onclick={() => toggleEditTest(t._id)}>
														<div class="flex items-center justify-between gap-3">
															<span class="min-w-0 flex-1 truncate font-semibold text-[var(--page-text)]">{testLabel(t)}</span>
															<span class="rounded-full border border-[var(--sh-exam-card-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--sh-ai-sub)]">{testStatusLabel(t)}</span>
															<span class="shrink-0 inline-flex h-5 w-10 items-center justify-center rounded-full text-xs font-bold {isEditTestSelected(t._id) ? 'bg-[var(--accent-cta-cyan)] text-white' : 'bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] border border-[var(--sh-exam-card-border)]'}">{isEditTestSelected(t._id) ? 'ON' : 'OFF'}</span>
														</div>
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</section>
							{:else}
								<section class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
									<h3 class="text-sm font-bold text-[var(--page-text)]">Students</h3>
									{#if editStudentsLoading}
										<div class="mt-3 space-y-2">{#each Array(4) as _}<div class="h-8 rounded-xl border border-[var(--sh-exam-card-border)]"></div>{/each}</div>
									{:else}
										<ul class="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
											{#each editStudents as u (u._id)}
												<li>
													<button type="button" class="w-full rounded-xl border px-3 py-2 text-sm border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_90%,transparent)] hover:border-[var(--sh-exam-card-hover-border)]" onclick={() => toggleEditStudent(u._id)}>
														<div class="flex items-center justify-between gap-3">
															<span class="min-w-0 flex-1 truncate font-semibold text-[var(--page-text)]">{studentLabel(u)}</span>
															<span class="shrink-0 inline-flex h-5 w-10 items-center justify-center rounded-full text-xs font-bold {isEditStudentSelected(u._id) ? 'bg-[var(--whatsapp-brand)] text-white' : 'bg-[var(--sh-exam-card-bg)] text-[var(--sh-ai-sub)] border border-[var(--sh-exam-card-border)]'}">{isEditStudentSelected(u._id) ? 'ON' : 'OFF'}</span>
														</div>
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</section>
							{/if}
						</div>
					</div>
					{#if editBatchError}
						<p class="mt-3 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">{editBatchError}</p>
					{/if}
					{#if editBatchSuccess}
						<p class="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{editBatchSuccess}</p>
					{/if}
					<div class="mt-5 flex items-center justify-between gap-2">
						<button type="button" class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)]" onclick={() => { editBatchStep = 1; editBatchError = null; }}>
							Back
						</button>
						<button type="button" class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60" disabled={editSelectedTestIds.length === 0 || editSelectedStudentIds.length === 0 || editSubmitting} onclick={onFinishEditBatch}>
							{editSubmitting ? 'Saving…' : 'Continue'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
