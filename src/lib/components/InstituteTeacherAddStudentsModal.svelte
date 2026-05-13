<script lang="ts">
	import { get } from 'svelte/store';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { debounce } from '$lib/utils/debounce';
	import {
		fetchInstituteUsers,
		unwrapInstituteUsersPage,
		createInstituteTeacherStudentRelations,
		type InstituteUserRow
	} from '$lib/api/instituteUsers';
	import { notifyError, notifySuccess } from '$lib/notifications';
	import { authStore } from '$lib/stores/auth';

	type Row = InstituteUserRow & { image?: string | null; profileImage?: string | null };

	let {
		open = false,
		teacherId = null as string | null,
		onClose,
		onRelationsSaved
	}: {
		open: boolean;
		teacherId: string | null;
		onClose: () => void;
		/** Optional refresh after a successful save (e.g. `invalidateAll`). */
		onRelationsSaved?: () => void;
	} = $props();

	let students = $state<Row[]>([]);
	let studentsPage = $state(1);
	let studentsLastPage = $state(1);
	let studentsLoading = $state(false);
	let studentsLoadingMore = $state(false);
	let studentsSearch = $state('');
	let selectedStudentIds = $state<string[]>([]);
	let continueSubmitting = $state(false);

	const PAGE_LIMIT = 30;

	function sid(u: Row): string {
		return String(u._id ?? '');
	}

	function label(u: Row): string {
		const n = `${(u.firstName ?? '').trim()} ${(u.lastName ?? '').trim()}`.trim();
		return n || '—';
	}

	function emailOf(u: Row): string {
		return u.userProfileId?.email ?? '';
	}

	function phoneOf(u: Row): string {
		return u.userProfileId?.phone ?? '';
	}

	function imgOf(u: Row): string {
		return u.image || u.profileImage || '';
	}

	function initials(s: string): string {
		return (
			s
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((p) => p[0]?.toUpperCase())
				.join('') || 'S'
		);
	}

	async function fetchPage(page: number, append: boolean) {
		const token = get(authStore).token;
		if (append) studentsLoadingMore = true;
		else studentsLoading = true;
		const res = await fetchInstituteUsers({
			role: 'student',
			relation: true,
			page,
			limit: PAGE_LIMIT,
			search: studentsSearch.trim() || undefined,
			token,
			fetchFn: fetch
		});
		const payload = unwrapInstituteUsersPage(res);
		if (!payload) {
			if (!append) {
				students = [];
				selectedStudentIds = [];
			}
			studentsLastPage = 1;
		} else {
			studentsLastPage = payload.lastPage ?? 1;
			const chunk = (payload.data ?? []) as Row[];
			if (append) {
				students = [...students, ...chunk];
			} else {
				students = chunk;
				selectedStudentIds = [];
			}
			studentsPage = page;
		}
		studentsLoading = false;
		studentsLoadingMore = false;
	}

	function maybeLoadMore(el: HTMLElement) {
		if (
			!studentsLoadingMore &&
			!studentsLoading &&
			studentsPage < studentsLastPage &&
			el.scrollTop + el.clientHeight >= el.scrollHeight - 60
		) {
			void fetchPage(studentsPage + 1, true);
		}
	}

	const runSearch = debounce(() => {
		studentsPage = 1;
		void fetchPage(1, false);
	}, 400);

	$effect(() => {
		if (!open || !teacherId) return;
		studentsSearch = '';
		selectedStudentIds = [];
		students = [];
		studentsPage = 1;
		studentsLastPage = 1;
		void fetchPage(1, false);
	});

	function toggleStudent(id: string) {
		if (selectedStudentIds.includes(id)) {
			selectedStudentIds = selectedStudentIds.filter((x) => x !== id);
		} else {
			selectedStudentIds = [...selectedStudentIds, id];
		}
	}

	function toggleAll(checked: boolean) {
		if (!checked) {
			selectedStudentIds = [];
			return;
		}
		selectedStudentIds = students.map((u) => sid(u)).filter(Boolean);
	}

	function isSelected(id: string): boolean {
		return selectedStudentIds.includes(id);
	}

	async function handleContinue() {
		if (!teacherId || selectedStudentIds.length === 0 || continueSubmitting) return;
		continueSubmitting = true;
		const res = await createInstituteTeacherStudentRelations({
			teacherId,
			add: selectedStudentIds.slice(),
			token: get(authStore).token,
			fetchFn: fetch
		});
		continueSubmitting = false;

		if (res.success) {
			notifySuccess(res.message || 'Students linked successfully.');
			onRelationsSaved?.();
		} else {
			notifyError(res.message || 'Could not link students.');
		}

		queueMicrotask(() => onClose());
	}
</script>

{#if open && teacherId}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-label="Add students for teacher"
		onclick={(e) => e.target === e.currentTarget && !continueSubmitting && onClose()}
	>
		<div
			class="flex h-[92vh] max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="shrink-0 text-lg font-bold text-[var(--sh-section-title)]">Add students</h2>

			<div class="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
				<section
					class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3"
					aria-label="Select students"
				>
					<div class="flex items-center justify-between gap-2">
						<h3 class="text-sm font-bold text-[var(--page-text)]">Students ({selectedStudentIds.length})</h3>
						<label class="inline-flex items-center gap-2 text-xs text-[var(--sh-ai-sub)]">
							<input
								type="checkbox"
								checked={students.length > 0 && students.every((u) => isSelected(sid(u)))}
								onchange={(e) => toggleAll((e.currentTarget as HTMLInputElement).checked)}
							/>
							Select all
						</label>
					</div>
					<input
						type="search"
						placeholder="Search students by name"
						class="mt-3 w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
						value={studentsSearch}
						oninput={(e) => {
							studentsSearch = (e.currentTarget as HTMLInputElement).value;
							runSearch();
						}}
					/>
					{#if studentsLoading}
						<div class="mt-3 flex-1 space-y-2 overflow-auto pr-1">
							{#each Array(7) as _}
								<div
									class="flex items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-2"
								>
									<div class="h-5 w-10 rounded-full bg-[var(--page-card-border)] opacity-20"></div>
									<Skeleton width="w-28" height="h-3" />
								</div>
							{/each}
						</div>
					{:else}
						<ul
							class="mt-3 flex-1 space-y-2 overflow-auto pr-1"
							role="list"
							onscroll={(e) => maybeLoadMore(e.currentTarget as HTMLElement)}
						>
							{#each students as u, index (`${sid(u)}-${index}`)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2 text-sm transition-colors hover:border-[var(--sh-exam-card-hover-border)]"
									>
										<input
											type="checkbox"
											checked={isSelected(sid(u))}
											onchange={() => toggleStudent(sid(u))}
											class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
										/>
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[10px] font-bold text-[var(--page-text)]"
										>
											{#if imgOf(u)}
												<img src={imgOf(u)} alt={label(u)} class="h-full w-full object-cover" />
											{:else}
												{initials(label(u))}
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate font-semibold text-[var(--page-text)]">{label(u)}</p>
											<p class="truncate text-[11px] text-[var(--sh-ai-sub)]">
												{emailOf(u) || 'No email'}
												{#if phoneOf(u)}
													<span class="mx-1">•</span>{phoneOf(u)}
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
			</div>

			<div class="mt-5 flex shrink-0 items-center justify-end gap-2">
				<button
					type="button"
					class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
					onclick={onClose}
					disabled={continueSubmitting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
					disabled={selectedStudentIds.length === 0 || continueSubmitting}
					onclick={() => void handleContinue()}
				>
					{continueSubmitting ? 'Saving…' : 'Continue'}
				</button>
			</div>
		</div>
	</div>
{/if}
