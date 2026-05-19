<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import Pagination from '$lib/components/Pagination.svelte';
	import ManagementTableSkeleton from '$lib/components/ManagementTableSkeleton.svelte';
	import ConfirmPermanentRemoveModal from '$lib/components/ConfirmPermanentRemoveModal.svelte';
	import InstituteTeacherAddStudentsModal from '$lib/components/InstituteTeacherAddStudentsModal.svelte';
	import InstituteUserViewDetailsModal from '$lib/components/InstituteUserViewDetailsModal.svelte';
	import {
		removeInstituteUsers,
		updateTeacherBatchApproval,
		type InstituteUserRow,
		type InstituteUsersPagePayload
	} from '$lib/api/instituteUsers';
	import { notifyError, notifySuccess } from '$lib/notifications';
	import { authStore } from '$lib/stores/auth';

	type Variant = 'students' | 'teachers';

	let {
		variant,
		streamedList,
		pageTitle,
		ssrAuthMissing
	}: {
		variant: Variant;
		streamedList: Promise<InstituteUsersPagePayload | null>;
		pageTitle: string;
		ssrAuthMissing: boolean;
	} = $props();

	let loading = $state(false);
	let rows = $state<InstituteUserRow[]>([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let searchInput = $state('');
	let selectedIds = $state<string[]>([]);
	let confirmRemoveOpen = $state(false);
	let removeError = $state('');
	/** When true, streamed list refetches (GET) apply without showing the table skeleton — used during remove + invalidate. */
	let suppressListLoading = $state(false);
	let addStudentsModalOpen = $state(false);
	let addStudentsTeacherId = $state<string | null>(null);
	let batchConfirmOpen = $state(false);
	let batchPending = $state<{ id: string; name: string; next: boolean } | null>(null);
	let viewDetailsOpen = $state(false);
	let viewDetailsUserId = $state<string | null>(null);
	let viewDetailsUserName = $state('');

	const roleColumnLabel = $derived(variant === 'teachers' ? 'TEACHER' : 'STUDENT');

	const emptyCopy = $derived(
		variant === 'teachers'
			? 'Your institute currently has no teachers to display.'
			: 'Your institute currently has no students to display.'
	);

	const entitySingular = $derived(variant === 'teachers' ? 'teacher' : 'student');
	const entityPlural = $derived(variant === 'teachers' ? 'teachers' : 'students');

	$effect(() => {
		if (typeof ssrAuthMissing !== 'boolean') return;
		/* When there is no SSR token, skip list loading — do not force loading=true when auth is present (stream effect owns that). */
		if (ssrAuthMissing) loading = false;
	});

	$effect(() => {
		searchInput = (page.url.searchParams.get('search') ?? '').trim();
	});

	$effect(() => {
		const p = streamedList;
		if (!p || typeof (p as any).then !== 'function') return;

		const showSkeleton = !suppressListLoading;
		if (showSkeleton) loading = true;
		void p.then((payload) => {
			if (!payload) {
				rows = [];
				currentPage = 1;
				totalPages = 1;
				selectedIds = [];
				loading = false;
				suppressListLoading = false;
				return;
			}
			rows = payload.data ?? [];
			currentPage = payload.currentPage ?? 1;
			totalPages = payload.lastPage ?? 1;
			selectedIds = [];
			loading = false;
			suppressListLoading = false;
		});
	});

	function toggleSelected(id: string, checked: boolean) {
		if (checked) {
			if (!selectedIds.includes(id)) selectedIds = [...selectedIds, id];
			return;
		}
		selectedIds = selectedIds.filter((x) => x !== id);
	}

	const visibleIds = $derived(rows.map((u) => u._id).filter(Boolean));

	const allVisibleSelected = $derived(
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
	);

	function toggleSelectAll(checked: boolean) {
		if (checked) {
			selectedIds = Array.from(new Set([...selectedIds, ...visibleIds]));
			return;
		}
		selectedIds = selectedIds.filter((id) => !visibleIds.includes(id));
	}

	function hrefForPage(p: number): string {
		const u = new URL(page.url);
		u.searchParams.set('page', String(p));
		return `${u.pathname}${u.search}`;
	}

	async function applySearch(query?: string) {
		const u = new URL(page.url);
		const v = (query ?? searchInput).trim();
		if (v) u.searchParams.set('search', v);
		else u.searchParams.delete('search');
		u.searchParams.set('page', '1');
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

	function contactEmail(u: InstituteUserRow): string {
		const up = u.userProfileId;
		return typeof up?.email === 'string' ? up.email : '';
	}

	function contactPhone(u: InstituteUserRow): string {
		const up = u.userProfileId;
		return typeof up?.phone === 'string' ? up.phone : '';
	}

	function displayName(u: InstituteUserRow): string {
		const name = `${(u.firstName ?? '').trim()} ${(u.lastName ?? '').trim()}`.trim();
		return name || '—';
	}

	function openViewDetails(u: InstituteUserRow) {
		viewDetailsUserId = u._id;
		viewDetailsUserName = displayName(u);
		viewDetailsOpen = true;
	}

	function closeViewDetails() {
		viewDetailsOpen = false;
		viewDetailsUserId = null;
		viewDetailsUserName = '';
	}

	const viewDetailsRole = $derived(variant === 'teachers' ? 'teacher' : 'student');

	function closeRemoveModal() {
		confirmRemoveOpen = false;
		removeError = '';
	}

	function requestBatchApprovalChange(u: InstituteUserRow, e: Event) {
		const el = e.currentTarget as HTMLSelectElement;
		const next = el.value === 'true';
		const current = u.batchApproved === true;
		if (next === current) return;
		el.value = current ? 'true' : 'false';
		batchPending = { id: u._id, name: displayName(u), next };
		batchConfirmOpen = true;
	}

	function closeBatchConfirmModal() {
		batchConfirmOpen = false;
	}

	function finalizeBatchModalAfterOutro() {
		if (!batchConfirmOpen) batchPending = null;
	}

	function confirmBatchApprovalChange() {
		const pending = batchPending;
		if (!pending) return;

		const { id, name, next } = pending;
		const previous = rows.find((r) => r._id === id)?.batchApproved;

		closeBatchConfirmModal();
		rows = rows.map((r) => (r._id === id ? { ...r, batchApproved: next } : r));

		const token = get(authStore).token;
		void updateTeacherBatchApproval({
			teacherId: id,
			batchApproved: next,
			token,
			fetchFn: fetch
		}).then((res) => {
			if (!res.success) {
				rows = rows.map((r) => (r._id === id ? { ...r, batchApproved: previous } : r));
				notifyError(res.message || 'Failed to update batch approval');
				return;
			}

			notifySuccess(
				next
					? `${name} can now create and manage batches.`
					: `Batch permission removed for ${name}.`
			);
			suppressListLoading = true;
			void invalidateAll();
		});
	}

	function executeRemovePermanently() {
		const ids = selectedIds.slice();
		if (!ids.length) return;

		const previousRows = rows.slice();
		removeError = '';
		/* Hide table skeleton for the follow-up GET after invalidate (and until the stream resolves). */
		suppressListLoading = true;

		confirmRemoveOpen = false;
		rows = rows.filter((r) => !ids.includes(r._id));
		selectedIds = [];

		const token = get(authStore).token;
		void removeInstituteUsers({
			role: variant === 'teachers' ? 'teacher' : 'student',
			ids,
			token,
			fetchFn: fetch
		}).then((res) => {
			if (!res.success) {
				rows = previousRows;
				suppressListLoading = false;
				const msg = res.message || 'Something went wrong';
				removeError = msg;
				notifyError(msg);
				return;
			}

			const removedCount = ids.length;
			notifySuccess(
				`Successfully removed ${removedCount} ${removedCount === 1 ? entitySingular : entityPlural}.`
			);

			void invalidateAll();
		});
	}
</script>

<svelte:head>
	<title>{pageTitle} — Exam Abhyas</title>
</svelte:head>

<div
	class="min-h-full bg-[var(--page-bg)] font-sans text-[var(--page-text)] transition-colors duration-300"
>
	<div class="mx-auto max-w-6xl px-4 py-2">
		<header class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
			<div class="min-w-0 sm:justify-self-start"></div>
			<div class="flex justify-center sm:justify-self-center"></div>
			<div class="flex items-center justify-end gap-3 sm:justify-self-end"></div>
		</header>

		<div
			class="mb-4 grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)_10rem] sm:items-center sm:gap-x-4"
		>
			<form
				class="flex min-w-0 items-center gap-2 sm:max-w-[260px]"
				onsubmit={(e) => {
					e.preventDefault();
					void applySearch();
				}}
			>
				<input
					type="search"
					placeholder="Search by name"
					class="w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm text-[var(--page-text)]"
					bind:value={searchInput}
				/>
				{#if variant === 'teachers'}
					<select
						class="tests-filter-select shrink-0 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-2 py-2 text-sm"
						value={page.url.searchParams.get('approved') ?? ''}
						onchange={(e) => {
							const u = new URL(page.url);
							const v = (e.currentTarget as HTMLSelectElement).value;
							if (v) u.searchParams.set('approved', v);
							else u.searchParams.delete('approved');
							u.searchParams.set('page', '1');
							void goto(`${u.pathname}${u.search}`, { keepFocus: true, noScroll: true, replaceState: true });
						}}
					>
						<option value="">All</option>
						<option value="true">Approved</option>
						<option value="false">Not approved</option>
					</select>
				{/if}
			</form>

			<div class="flex min-h-10 min-w-0 justify-center overflow-x-auto px-1 py-0.5 sm:min-h-0">
				{#if !loading && totalPages > 1}
					<Pagination
						{currentPage}
						{totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix={`institute-${variant}-top`}
					/>
				{/if}
			</div>

			<div class="flex min-h-[40px] items-center justify-end sm:justify-end">
				{#if selectedIds.length > 0}
					<button
						type="button"
						class="w-full cursor-pointer rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm font-semibold text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)] sm:w-auto"
						onclick={() => {
							removeError = '';
							confirmRemoveOpen = true;
						}}
					>
						Remove
					</button>
				{/if}
			</div>
		</div>

		{#if loading}
			<ManagementTableSkeleton
				firstColumnLabel={roleColumnLabel}
				thirdColumnLabel="Batch Approval"
				rowCount={8}
				showStatusColumn={variant === 'teachers'}
			/>
		{:else if rows.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-16 text-center"
			>
				<p class="text-sm font-semibold text-[var(--sh-section-title)]">
					No {variant === 'teachers' ? 'teachers' : 'students'} found
				</p>
				<p class="mt-1 max-w-md text-xs text-[var(--sh-ai-sub)]">{emptyCopy}</p>
			</div>
		{:else}
			<div class="table-wrap bg-[var(--sh-exam-card-bg)]">
				<table class="perf-table">
					<thead>
						<tr>
							<th>
								<div class="flex items-center gap-2">
									<input
										id="institute-select-all-{variant}"
										type="checkbox"
										checked={allVisibleSelected}
										onchange={(e) =>
											toggleSelectAll((e.currentTarget as HTMLInputElement).checked)}
									/>
									<span>{roleColumnLabel}</span>
								</div>
							</th>
							<th>Contact</th>
							{#if variant === 'teachers'}
								<th>Batch Approval</th>
							{/if}
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as u (u._id)}
							<tr>
								<td>
									<div class="flex items-center gap-3">
										<input
											type="checkbox"
											checked={selectedIds.includes(u._id)}
											onchange={(e) =>
												toggleSelected(
													u._id,
													(e.currentTarget as HTMLInputElement).checked
												)}
										/>
										<div class="font-semibold text-[var(--page-text)]">{displayName(u)}</div>
									</div>
								</td>
								<td>
									<div class="text-[var(--page-text)] transition-colors hover:text-[var(--page-link)]">
										{contactEmail(u) || '—'}
									</div>
									<div class="mt-1 text-xs text-[var(--page-text-muted)]">
										{contactPhone(u) || '—'}
									</div>
								</td>
								{#if variant === 'teachers'}
									<td>
										<select
											class="tests-filter-select min-w-[8.5rem] rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-2 py-1 text-xs"
											value={u.batchApproved === true ? 'true' : 'false'}
											onchange={(e) => requestBatchApprovalChange(u, e)}
										>
											<option value="true">Approved</option>
											<option value="false">Un-approved</option>
										</select>
									</td>
								{/if}
								<td>
									<div class="flex flex-wrap items-center gap-1.5">
										<button
											type="button"
											class="cursor-pointer rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-2 py-1 text-xs font-semibold leading-snug text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
											onclick={() => openViewDetails(u)}
										>
											View
										</button>
										{#if variant === 'teachers'}
											<button
												type="button"
												class="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--page-link)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--page-link)_08%,transparent)] px-2 py-1 text-xs font-semibold leading-snug text-[var(--page-link)] transition-colors hover:border-[var(--page-link)] hover:bg-[color-mix(in_srgb,var(--page-link)_12%,transparent)]"
												onclick={() => {
													addStudentsTeacherId = u._id;
													addStudentsModalOpen = true;
												}}
											>
												Add Student
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
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
						keyPrefix={`institute-${variant}-bottom`}
					/>
				</div>
			{/if}
		{/if}
	</div>
</div>

<InstituteTeacherAddStudentsModal
	open={addStudentsModalOpen}
	teacherId={addStudentsTeacherId}
	onClose={() => {
		addStudentsModalOpen = false;
		addStudentsTeacherId = null;
	}}
	onRelationsSaved={() => void invalidateAll()}
/>

<InstituteUserViewDetailsModal
	open={viewDetailsOpen}
	userId={viewDetailsUserId}
	userName={viewDetailsUserName}
	role={viewDetailsRole}
	onClose={closeViewDetails}
/>

<ConfirmPermanentRemoveModal
	open={confirmRemoveOpen}
	title="Remove permanently?"
	entitySingular={entitySingular}
	entityPlural={entityPlural}
	count={selectedIds.length}
	submitting={false}
	errorMessage={removeError}
	onCancel={closeRemoveModal}
	onConfirm={executeRemovePermanently}
/>

{#if batchConfirmOpen && batchPending}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="batch-approval-confirm-title"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
		onoutroend={finalizeBatchModalAfterOutro}
		onclick={(e) => e.target === e.currentTarget && closeBatchConfirmModal()}
		onkeydown={(e) => e.key === 'Escape' && closeBatchConfirmModal()}
	>
		<div
			class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
			role="document"
			transition:scale={{ duration: 220, easing: quintOut, start: 0.92 }}
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="batch-approval-confirm-title" class="text-lg font-bold text-[var(--sh-section-title)]">
				{batchPending.next ? 'Allow batch creation?' : 'Remove batch permission?'}
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
				{#if batchPending.next}
					Do you want to give <span class="font-semibold text-[var(--sh-section-title)]">{batchPending.name}</span>
					permission to create and manage batches for your institute?
				{:else}
					Remove batch creation permission for
					<span class="font-semibold text-[var(--sh-section-title)]">{batchPending.name}</span>?
					They will no longer be able to create or manage batches.
				{/if}
			</p>
			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--sh-section-title)]"
					onclick={closeBatchConfirmModal}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl border border-[color-mix(in_srgb,var(--whatsapp-brand)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_88%,#000_8%)] px-4 py-2.5 text-sm font-semibold text-white"
					onclick={confirmBatchApprovalChange}
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
