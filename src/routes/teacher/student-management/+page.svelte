<script lang="ts">
	import { invalidateAll } from "$app/navigation";
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

	function updateStudentActive(id: string, isActive: boolean) {
		studentsData = studentsData.map((row) => {
			const s = getRowStudent(row) as any;
			if (!s || s._id !== id) return row;

			if ("student" in (row as any)) {
				const r: any = row;
				return {
					...r,
					student: {
						...r.student,
						isActive
					}
				};
			}

			return {
				...(row as any),
				isActive
			};
		});
	}

	function removeStudentFromList(id: string) {
		studentsData = studentsData.filter((row) => {
			const s = getRowStudent(row) as any;
			return !(s && s._id === id);
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
</script>

<svelte:head>
	<title>Student Management — Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
	<div class="mx-auto max-w-6xl px-4 py-6">
		<header class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
			<div class="min-w-0 sm:justify-self-start">
				<h1 class="text-2xl font-bold text-[var(--page-text)]">Student Management</h1>
			</div>
			<div class="flex justify-center sm:justify-self-center">
				{#if !loading && totalPages > 1}
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix="teacher-student-management-top"
					/>
				{/if}
			</div>
			<div class="flex items-center justify-end gap-3 sm:justify-self-end">
				<button
					type="button"
					class="inline-flex cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)]"
					disabled={loading}
					onclick={() => void invalidateAll()}
				>
					{loading ? "Refreshing…" : "Refresh"}
				</button>
			</div>
		</header>

		{#if errorMessage}
			<div class="mb-4 rounded-2xl border border-semantic-error/60 bg-[color-mix(in_srgb,rgba(239,68,68,0.1),transparent)] p-4 text-sm text-semantic-error">
				{errorMessage}
			</div>
		{/if}

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
		{:else if studentsData.length === 0}
			<div class="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]">
				<p class="text-sm font-semibold text-[var(--sh-section-title)]">No students found</p>
				<p class="mt-1 max-w-md text-xs text-[var(--sh-ai-sub)]">
					Your teacher account currently has no students to manage.
				</p>
			</div>
		{:else}
			<div class="table-wrap bg-[var(--sh-exam-card-bg)]">
				<table class="perf-table">
					<thead>
						<tr>
							<th>Student</th>
							<th>Contact</th>
							<th>Status</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each studentsData as row (studentId(row))}
							{@const s: any = getRowStudent(row)}
							<tr>
								<td>
									<div class="font-semibold text-[var(--page-text)]">
										{(s.firstName ?? "").trim()} {(s.lastName ?? "").trim()}
										{#if (!(s.firstName ?? "").trim() && !(s.lastName ?? "").trim())}—{/if}
									</div>
								</td>
								<td>
									<div>{s.email ? s.email : "—"}</div>
									<div class="mt-1 text-xs text-[var(--page-text-muted)]">{s.phone ? s.phone : "—"}</div>
								</td>
								<td>
									{#if s.isActive === false}
										<span class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--semantic-error)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_12%,transparent)] px-3 py-1 text-xs font-semibold text-semantic-error">Blocked</span>
									{:else}
										<span class="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]">Active</span>
									{/if}
								</td>
								<td class="text-right">
									<div class="flex flex-row flex-wrap items-center justify-end gap-2">
										{#if s.isActive === false}
											<form
												method="POST"
												action="?/unblock"
												class="inline"
												onsubmit={() => {
													actionLoadingForId = `unblock:${s._id}`;
													errorMessage = null;
												}}
												use:enhance={() => {
													const id = s._id;
													return async ({ result }: any) => {
														actionLoadingForId = null;
														if (result.type === "success") {
															updateStudentActive(id, false);
															return;
														}
														errorMessage = result?.data?.message || "Unblock failed.";
													};
												}}
											>
												<input type="hidden" name="students" value={s._id} />
												<button
													type="submit"
													disabled={actionLoadingForId?.startsWith('unblock:')}
													class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--cta-cyan-border)] bg-[var(--cta-cyan-bg)] text-[var(--cta-cyan-text)] transition-colors hover:border-[var(--pagination-active-from)] hover:bg-[var(--cta-cyan-hover-bg)] cursor-pointer"
												>
													{actionLoadingForId?.startsWith('unblock:') ? 'Unblocking…' : 'Unblock'}
												</button>
											</form>
										{:else}
											<form
												method="POST"
												action="?/block"
												class="inline"
												onsubmit={() => {
													actionLoadingForId = `block:${s._id}`;
													errorMessage = null;
												}}
												use:enhance={() => {
													const id = s._id;
													return async ({ result }: any) => {
														actionLoadingForId = null;
														if (result.type === "success") {
															updateStudentActive(id, true);
															return;
														}
														errorMessage = result?.data?.message || "Block failed.";
													};
												}}
											>
												<input type="hidden" name="students" value={s._id} />
												<button
													type="submit"
													disabled={actionLoadingForId?.startsWith('block:')}
													class="rounded-xl border px-3 py-2 text-sm font-semibold border-[color-mix(in_srgb,var(--semantic-error)_55%,var(--sh-exam-card-border))] bg-[var(--cta-cyan-bg)] text-semantic-error transition-colors hover:border-[var(--pagination-active-from)] hover:bg-[var(--cta-cyan-hover-bg)] cursor-pointer"
												>
													{actionLoadingForId?.startsWith('block:') ? 'Blocking…' : 'Block'}
												</button>
											</form>
										{/if}

										<form
											method="POST"
											action="?/remove"
											class="inline"
											onsubmit={(e) => {
												if (!canRemove()) {
													e.preventDefault();
													errorMessage = "Remove is available only for independent teachers.";
													return;
												}
												if (!confirm("Remove this student from you permanently?")) {
													e.preventDefault();
													return;
												}
												actionLoadingForId = `remove:${s._id}`;
												errorMessage = null;
											}}
											use:enhance={() => {
												const id = s._id;
												return async ({ result }: any) => {
													actionLoadingForId = null;
													if (result.type === "success") {
														removeStudentFromList(id);
														return;
													}
													errorMessage = result?.data?.message || "Remove failed.";
												};
											}}
										>
											<input type="hidden" name="students" value={s._id} />
											<button
												type="submit"
												disabled={!canRemove() || actionLoadingForId?.startsWith('remove:')}
												class="rounded-xl border px-3 py-2 text-sm font-semibold border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text)] transition-colors hover:border-[var(--pagination-active-from)] cursor-pointer"
											>
												{actionLoadingForId?.startsWith('remove:') ? 'Removing…' : 'Remove'}
											</button>
										</form>
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
						currentPage={currentPage}
						totalPages={totalPages}
						getHref={hrefForPage}
						windowSize={2}
						keyPrefix="teacher-student-management-bottom"
					/>
				</div>
			{/if}
		{/if}
	</div>
</div>

