<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import Pagination from "$lib/components/Pagination.svelte";
	import { type TeacherStudentsRow } from "$lib/api/studentManagement";
	import Skeleton from "$lib/components/Skeleton.svelte";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let actionLoadingForId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let searchInput = $state("");
	let selectedStudentIds = $state<string[]>([]);
	let bulkRemoveConfirmOpen = $state(false);
	let allowBulkRemoveSubmit = $state(false);
	let removeSelectedFormEl = $state<HTMLFormElement | null>(null);

	let mode = $state<string | null>(null);
	let studentsData = $state<TeacherStudentsRow[]>([]);
	let currentPage = $state(1);
	let totalPages = $state(1);

	function getRowStudent(row: TeacherStudentsRow) {
		return "student" in row ? row.student : row;
	}

	function studentId(row: TeacherStudentsRow) {
		const s = getRowStudent(row) as any;
		return typeof s?._id === "string" ? s._id : "";
	}

	function removeStudentsFromList(ids: string[]) {
		const idSet = new Set(ids);
		studentsData = studentsData.filter((row) => {
			const s = getRowStudent(row) as any;
			return !(s && idSet.has(s._id));
		});
	}

	$effect(() => {
		if (typeof data?.ssrAuthMissing !== "boolean") return;
		loading = !data.ssrAuthMissing;
	});

	$effect(() => {
		errorMessage = data?.actionError ?? null;
	});

	$effect(() => {
		searchInput = (page.url.searchParams.get("search") ?? "").trim();
	});

	$effect(() => {
		const p = data?.streamed?.studentsData;
		if (!p || typeof (p as any).then !== "function") return;

		loading = true;
		void p.then((payload: any) => {
			if (!payload) {
				loading = false;
				return;
			}
			mode = payload.mode ?? null;
			studentsData = payload.data ?? [];
			currentPage = payload.currentPage ?? 1;
			totalPages = payload.lastPage ?? 1;
			selectedStudentIds = [];
			loading = false;
		});
	});

	function canRemove() {
		return mode === "INDEPENDENT";
	}

	function hrefForPage(p: number): string {
		const u = new URL(page.url);
		u.searchParams.set("page", String(p));
		return `${u.pathname}${u.search}`;
	}

	async function applySearch(query?: string) {
		const u = new URL(page.url);
		const v = (query ?? searchInput).trim();
		if (v) u.searchParams.set("search", v);
		else u.searchParams.delete("search");
		u.searchParams.set("page", "1");
		await goto(`${u.pathname}${u.search}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true,
		});
	}

	function clearSearch() {
		searchInput = "";
		void applySearch();
	}

	const SEARCH_DEBOUNCE_MS = 1000;

	$effect(() => {
		const currentSearch = (
			page.url.searchParams.get("search") ?? ""
		).trim();
		const nextSearch = searchInput.trim();
		if (nextSearch === currentSearch) return;

		const t = setTimeout(() => {
			void applySearch(nextSearch);
		}, SEARCH_DEBOUNCE_MS);

		return () => clearTimeout(t);
	});

	function toggleSelected(id: string, checked: boolean) {
		if (checked) {
			if (!selectedStudentIds.includes(id))
				selectedStudentIds = [...selectedStudentIds, id];
			return;
		}
		selectedStudentIds = selectedStudentIds.filter((x) => x !== id);
	}

	const visibleStudentIds = $derived(
		studentsData.map((row) => studentId(row)).filter(Boolean),
	);

	const allVisibleSelected = $derived(
		visibleStudentIds.length > 0 &&
			visibleStudentIds.every((id) => selectedStudentIds.includes(id)),
	);

	function toggleSelectAll(checked: boolean) {
		if (checked) {
			selectedStudentIds = Array.from(
				new Set([...selectedStudentIds, ...visibleStudentIds]),
			);
			return;
		}
		selectedStudentIds = selectedStudentIds.filter(
			(id) => !visibleStudentIds.includes(id),
		);
	}
</script>

<svelte:head>
	<title>Student Management — Exam Abhyas</title>
</svelte:head>

<div
	class="min-h-full bg-[var(--page-bg)] text-[var(--page-text)] font-sans transition-colors duration-300"
>
	<div class="mx-auto max-w-6xl px-4 py-2">
		<header
			class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
		>
			<div class="min-w-0 sm:justify-self-start">
				<!-- <h1 class="text-2xl font-bold text-[var(--page-text)]">
					Student Management
				</h1> -->
			</div>
			<div class="flex justify-center sm:justify-self-center"></div>
			<div
				class="flex items-center justify-end gap-3 sm:justify-self-end"
			>
				<!-- <button
					type="button"
					class="inline-flex cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
					disabled={loading}
					onclick={() => void invalidateAll()}
				>
					{loading ? "Refreshing…" : "Refresh"}
				</button> -->
			</div>
		</header>

		{#if errorMessage}
			<div
				class="mb-4 rounded-2xl border border-semantic-error/60 bg-[color-mix(in_srgb,rgba(239,68,68,0.1),transparent)] p-4 text-sm text-semantic-error"
			>
				{errorMessage}
			</div>
		{/if}

		<div class="mb-4 flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-3">
				<form
					class="flex w-full max-w-[260px] items-center gap-2"
					onsubmit={(e) => {
						e.preventDefault();
						void applySearch();
					}}
				>
					<input
						type="search"
						placeholder="Search by name"
						class="w-full rounded-xl border px-3 py-2 text-sm border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)]"
						bind:value={searchInput}
					/>
				</form>

				{#if selectedStudentIds.length > 0 || actionLoadingForId === "remove:selected"}
					<form
						method="POST"
						action="?/remove"
						class="ml-auto"
						bind:this={removeSelectedFormEl}
						use:enhance={() => {
							const ids = [...selectedStudentIds];
							return async ({ result }: any) => {
								actionLoadingForId = null;
								if (result.type === "success") {
									removeStudentsFromList(ids);
									selectedStudentIds = selectedStudentIds.filter(
										(id) => !ids.includes(id),
									);
									bulkRemoveConfirmOpen = false;
									return;
								}
								errorMessage =
									result?.data?.message || "Remove failed.";
							};
						}}
						onsubmit={(e) => {
							if (!allowBulkRemoveSubmit) {
								e.preventDefault();
								return;
							}
							allowBulkRemoveSubmit = false;
							actionLoadingForId = "remove:selected";
							errorMessage = null;
						}}
					>
						{#each selectedStudentIds as id (id)}
							<input type="hidden" name="students" value={id} />
						{/each}
						<button
							type="button"
							disabled={!canRemove() ||
								!selectedStudentIds.length ||
								actionLoadingForId === "remove:selected"}
							class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)] cursor-pointer"
							onclick={() => {
								if (!canRemove()) {
									errorMessage =
										"Remove is available only for independent teachers.";
									return;
								}
								if (!selectedStudentIds.length) {
									errorMessage = "Select at least one student.";
									return;
								}
								errorMessage = null;
								bulkRemoveConfirmOpen = true;
							}}
						>
							{actionLoadingForId === "remove:selected"
								? "Removing…"
								: `Remove selected (${selectedStudentIds.length})`}
						</button>
					</form>
				{/if}
			</div>

			{#if !loading && totalPages > 1}
				<div class="flex justify-center">
					<Pagination
						{currentPage}
						{totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix="teacher-student-management-top"
					/>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div
						class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5"
					>
						<Skeleton width="w-3/4" height="h-5" className="mb-3" />
						<Skeleton
							width="w-full"
							height="h-3"
							className="mb-2"
						/>
						<Skeleton width="w-2/3" height="h-3" className="mb-2" />
						<Skeleton
							width="w-24"
							height="h-8"
							rounded="rounded-xl"
						/>
					</div>
				{/each}
			</div>
		{:else if studentsData.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
			>
				<p class="text-sm font-semibold text-[var(--sh-section-title)]">
					No students found
				</p>
				<p class="mt-1 max-w-md text-xs text-[var(--sh-ai-sub)]">
					Your teacher account currently has no students to manage.
				</p>
			</div>
		{:else}
			<div class="table-wrap bg-[var(--sh-exam-card-bg)]">
				<table class="perf-table">
					<thead>
						<tr>
							<th>
								<div class="flex items-center gap-2">
									<input
										id="select-all-visible"
										type="checkbox"
										checked={allVisibleSelected}
										onchange={(e) =>
											toggleSelectAll(
												(
													e.currentTarget as HTMLInputElement
												).checked,
											)}
									/>
									<span>STUDENT</span>
								</div>
							</th>
							<th>Contact</th>
							<th>Status</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{#each studentsData as row (studentId(row))}
							{@const s: any = getRowStudent(row)}
							<tr>
								<td>
									<div class="flex items-center gap-3">
										<input
											type="checkbox"
											checked={selectedStudentIds.includes(
												s._id,
											)}
											onchange={(e) =>
												toggleSelected(
													s._id,
													(
														e.currentTarget as HTMLInputElement
													).checked,
												)}
										/>
										<div
											class="font-semibold text-[var(--page-text)]"
										>
											{(s.firstName ?? "").trim()}
											{(s.lastName ?? "").trim()}
											{#if !(s.firstName ?? "").trim() && !(s.lastName ?? "").trim()}—{/if}
										</div>
									</div>
								</td>
								<td>
									<div class="text-[var(--page-text)] transition-colors hover:text-[var(--page-link)]">
										{s.email ? s.email : "—"}
									</div>
									<div
										class="mt-1 text-xs text-[var(--page-text-muted)]"
									>
										{s.phone ? s.phone : "—"}
									</div>
								</td>
								<td>
									{#if s.isActive === false}
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
										class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)] cursor-pointer"
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
						keyPrefix="teacher-student-management-bottom"
					/>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if bulkRemoveConfirmOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) =>
			e.target === e.currentTarget && (bulkRemoveConfirmOpen = false)}
		onkeydown={(e) => e.key === "Escape" && (bulkRemoveConfirmOpen = false)}
	>
		<div
			class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
		>
			<h2 class="text-lg font-bold text-[var(--sh-section-title)]">
				Remove students
			</h2>
			<p class="mt-2 text-sm text-[var(--sh-ai-sub)]">
				Remove {selectedStudentIds.length} selected student(s)?
			</p>
			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)]"
					onclick={() => {
						bulkRemoveConfirmOpen = false;
						allowBulkRemoveSubmit = false;
					}}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
					onclick={() => {
						allowBulkRemoveSubmit = true;
						bulkRemoveConfirmOpen = false;
						removeSelectedFormEl?.requestSubmit();
					}}
				>
					Remove
				</button>
			</div>
		</div>
	</div>
{/if}
