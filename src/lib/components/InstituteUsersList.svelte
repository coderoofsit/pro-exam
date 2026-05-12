<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import Pagination from '$lib/components/Pagination.svelte';
	import ManagementTableSkeleton from '$lib/components/ManagementTableSkeleton.svelte';
	import ConfirmPermanentRemoveModal from '$lib/components/ConfirmPermanentRemoveModal.svelte';
	import {
		removeInstituteUsers,
		type InstituteUserRow,
		type InstituteUsersPagePayload
	} from '$lib/api/instituteUsers';
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
	let removeSubmitting = $state(false);
	let removeError = $state('');

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
		loading = !ssrAuthMissing;
	});

	$effect(() => {
		searchInput = (page.url.searchParams.get('search') ?? '').trim();
	});

	$effect(() => {
		const p = streamedList;
		if (!p || typeof (p as any).then !== 'function') return;

		loading = true;
		void p.then((payload) => {
			if (!payload) {
				rows = [];
				currentPage = 1;
				totalPages = 1;
				selectedIds = [];
				loading = false;
				return;
			}
			rows = payload.data ?? [];
			currentPage = payload.currentPage ?? 1;
			totalPages = payload.lastPage ?? 1;
			selectedIds = [];
			loading = false;
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

	function closeRemoveModal() {
		if (removeSubmitting) return;
		confirmRemoveOpen = false;
		removeError = '';
	}

	async function executeRemovePermanently() {
		const ids = selectedIds.slice();
		if (!ids.length) return;

		removeSubmitting = true;
		removeError = '';

		const token = get(authStore).token;
		const res = await removeInstituteUsers({
			role: variant === 'teachers' ? 'teacher' : 'student',
			ids,
			token,
			fetchFn: fetch
		});

		removeSubmitting = false;

		if (!res.success) {
			removeError = res.message || 'Something went wrong';
			return;
		}

		confirmRemoveOpen = false;
		selectedIds = [];
		await invalidateAll();
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
				thirdColumnLabel={variant === 'teachers' ? 'Batch Approval' : 'Status'}
				rowCount={8}
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
							<th>{variant === 'teachers' ? 'Batch Approval' : 'Status'}</th>
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
								<td>
									{#if variant === 'teachers'}
										{#if u.batchApproved === true}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]"
												>Approval</span
											>
										{:else}
											<span
												class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--page-text-muted)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--page-text-muted)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--page-text-muted)]"
												>Un-Approval</span
											>
										{/if}
									{:else if u.isActive === false}
										<span
											class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--semantic-error)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_12%,transparent)] px-3 py-1 text-xs font-semibold text-semantic-error"
											>Blocked</span
										>
									{:else}
										<span
											class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]"
											>Active</span
										>
									{/if}
								</td>
								<td>
									<button
										type="button"
										class="cursor-pointer rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm font-semibold text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
									>
										View details
									</button>
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

<ConfirmPermanentRemoveModal
	open={confirmRemoveOpen}
	title="Remove permanently?"
	entitySingular={entitySingular}
	entityPlural={entityPlural}
	count={selectedIds.length}
	submitting={removeSubmitting}
	errorMessage={removeError}
	onCancel={closeRemoveModal}
	onConfirm={() => void executeRemovePermanently()}
/>
