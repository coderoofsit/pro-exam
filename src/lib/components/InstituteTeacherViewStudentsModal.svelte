<script lang="ts">
	import { get } from 'svelte/store';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { debounce } from '$lib/utils/debounce';
	import {
		deleteInstituteTeacherStudentRelations,
		fetchInstituteTeacherStudents,
		unwrapDeleteTeacherStudentsResult,
		unwrapInstituteTeacherStudentsPage,
		type InstituteTeacherLinkedStudent
	} from '$lib/api/instituteUsers';
	import { notifyError, notifySuccess } from '$lib/notifications';
	import { authStore } from '$lib/stores/auth';

	let {
		open = false,
		teacherId = null as string | null,
		teacherName = '',
		onClose,
		onRelationsSaved
	}: {
		open: boolean;
		teacherId: string | null;
		teacherName?: string;
		onClose: () => void;
		onRelationsSaved?: () => void;
	} = $props();

	let students = $state<InstituteTeacherLinkedStudent[]>([]);
	let studentsPage = $state(1);
	let studentsLastPage = $state(1);
	let studentsTotal = $state(0);
	let studentsLoading = $state(false);
	let studentsLoadingMore = $state(false);
	let studentsSearch = $state('');
	let selectedStudentIds = $state<string[]>([]);
	let removeSubmitting = $state(false);
	let confirmRemoveOpen = $state(false);
	/** Snapshot when confirm opens — avoids "0 students" while dialog is still open. */
	let confirmRemoveCount = $state(0);

	const PAGE_LIMIT = 30;

	const selectedCount = $derived(selectedStudentIds.length);

	const removeButtonLabel = $derived(
		selectedCount === 1 ? 'Remove 1 student' : `Remove ${selectedCount} students`
	);

	const visibleIds = $derived(students.map((u) => sid(u)).filter(Boolean));

	const allVisibleSelected = $derived(
		visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id))
	);

	function sid(u: InstituteTeacherLinkedStudent): string {
		return String(u._id ?? '');
	}

	function label(u: InstituteTeacherLinkedStudent): string {
		const n = `${(u.firstName ?? '').trim()} ${(u.lastName ?? '').trim()}`.trim();
		return n || '—';
	}

	function emailOf(u: InstituteTeacherLinkedStudent): string {
		return u.email ?? '';
	}

	function phoneOf(u: InstituteTeacherLinkedStudent): string {
		return u.phone ?? '';
	}

	function statusLabel(u: InstituteTeacherLinkedStudent): string {
		return u.isActive === false ? 'Inactive' : 'Active';
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

	function isSelected(id: string): boolean {
		return selectedStudentIds.includes(id);
	}

	function toggleStudent(id: string) {
		if (selectedStudentIds.includes(id)) {
			selectedStudentIds = selectedStudentIds.filter((x) => x !== id);
		} else {
			selectedStudentIds = [...selectedStudentIds, id];
		}
	}

	function toggleAllVisible(checked: boolean) {
		if (!checked) {
			selectedStudentIds = selectedStudentIds.filter((id) => !visibleIds.includes(id));
			return;
		}
		selectedStudentIds = Array.from(new Set([...selectedStudentIds, ...visibleIds]));
	}

	async function fetchPage(page: number, append: boolean) {
		if (!teacherId) return;
		const token = get(authStore).token;
		if (append) studentsLoadingMore = true;
		else studentsLoading = true;

		const res = await fetchInstituteTeacherStudents({
			teacherId,
			page,
			limit: PAGE_LIMIT,
			search: studentsSearch.trim() || undefined,
			token,
			fetchFn: fetch
		});
		const payload = unwrapInstituteTeacherStudentsPage(res);
		if (!payload) {
			if (!append) {
				students = [];
				studentsTotal = 0;
				selectedStudentIds = [];
			}
			studentsLastPage = 1;
			if (!res.success) {
				notifyError(res.message || 'Failed to load students.');
			}
		} else {
			studentsLastPage = payload.lastPage ?? 1;
			studentsTotal = payload.total ?? 0;
			if (append) {
				students = [...students, ...payload.items];
			} else {
				students = payload.items;
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
		selectedStudentIds = [];
		void fetchPage(1, false);
	}, 400);

	function openRemoveConfirm() {
		if (selectedStudentIds.length === 0 || removeSubmitting) return;
		confirmRemoveCount = selectedStudentIds.length;
		confirmRemoveOpen = true;
	}

	function closeRemoveConfirm() {
		confirmRemoveOpen = false;
	}

	async function handleRemove() {
		if (!teacherId || confirmRemoveCount === 0 || removeSubmitting) return;

		const ids = selectedStudentIds.slice();
		const count = confirmRemoveCount;
		removeSubmitting = true;
		confirmRemoveOpen = false;

		try {
			const res = await deleteInstituteTeacherStudentRelations({
				teacherId,
				studentIds: ids,
				token: get(authStore).token,
				fetchFn: fetch
			});

			const outcome = unwrapDeleteTeacherStudentsResult(res, count);
			if (outcome) {
				selectedStudentIds = [];
				confirmRemoveCount = 0;
				notifySuccess(outcome.message);
				onRelationsSaved?.();
				studentsPage = 1;
				await fetchPage(1, false);
				return;
			}

			notifyError(res.message || 'Could not remove students.');
		} catch {
			notifyError('Could not remove students. Please try again.');
		} finally {
			removeSubmitting = false;
			confirmRemoveOpen = false;
		}
	}

	$effect(() => {
		if (!open || !teacherId) return;
		studentsSearch = '';
		students = [];
		studentsPage = 1;
		studentsLastPage = 1;
		studentsTotal = 0;
		selectedStudentIds = [];
		confirmRemoveOpen = false;
		confirmRemoveCount = 0;
		void fetchPage(1, false);
	});
</script>

{#if open && teacherId}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-label="View teacher student list"
		onclick={(e) => e.target === e.currentTarget && !removeSubmitting && onClose()}
	>
		<div
			class="flex h-[92vh] max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="shrink-0 text-lg font-bold text-[var(--sh-section-title)]">
				{teacherName ? `${teacherName} — Students` : 'View student list'}
			</h2>

			<div class="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
				<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div
						class="grid shrink-0 grid-cols-1 border-b border-[var(--sh-exam-card-border)]"
						role="tablist"
						aria-label="Teacher students"
					>
						<button
							type="button"
							role="tab"
							aria-selected={true}
							class="batch-setup-modal__tab--active -mb-px border-b-2 px-3 py-2.5 text-left text-sm font-semibold text-[var(--page-text)]"
						>
							Total ({studentsTotal})
						</button>
					</div>

					<div class="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
						<section
							class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3"
							aria-label="Linked students"
						>
							<div class="flex items-center justify-between gap-2">
								<h3 class="text-sm font-bold text-[var(--page-text)]">Students</h3>
								<label class="inline-flex items-center gap-2 text-xs text-[var(--sh-ai-sub)]">
									<input
										type="checkbox"
										checked={allVisibleSelected}
										disabled={studentsLoading || visibleIds.length === 0 || removeSubmitting}
										onchange={(e) =>
											toggleAllVisible((e.currentTarget as HTMLInputElement).checked)}
									/>
									Select all
								</label>
							</div>
							<input
								type="search"
								placeholder="Search students by name"
								class="mt-3 w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2 text-sm text-[var(--page-text)] outline-none transition-colors focus:border-[var(--page-link)]"
								value={studentsSearch}
								disabled={removeSubmitting}
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
													disabled={removeSubmitting}
													onchange={() => toggleStudent(sid(u))}
													class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
												/>
												<div
													class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[10px] font-bold text-[var(--page-text)]"
												>
													{initials(label(u))}
												</div>
												<div class="min-w-0 flex-1">
													<p class="truncate font-semibold text-[var(--page-text)]">{label(u)}</p>
													<p class="truncate text-[11px] text-[var(--sh-ai-sub)]">
														{emailOf(u) || 'No email'}
														{#if phoneOf(u)}
															<span class="mx-1">•</span>{phoneOf(u)}
														{/if}
													</p>
													<p class="mt-0.5 text-xs text-[var(--sh-ai-sub)]">
														Status: {statusLabel(u)}
													</p>
												</div>
											</label>
										</li>
									{/each}
									{#if students.length === 0}
										<li class="text-xs text-[var(--sh-ai-sub)]">No students linked to this teacher.</li>
									{/if}
									{#if studentsLoadingMore}
										<li class="text-center text-xs text-[var(--sh-ai-sub)]">Loading more students...</li>
									{/if}
								</ul>
							{/if}
						</section>
					</div>
				</div>
			</div>

			<div class="mt-5 flex shrink-0 items-center justify-between gap-2">
				<button
					type="button"
					class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-semibold text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
					onclick={onClose}
					disabled={removeSubmitting}
				>
					Close
				</button>
				{#if selectedCount > 0}
					<button
						type="button"
						class="cursor-pointer rounded-xl border border-[color-mix(in_srgb,var(--semantic-error)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_92%,#fff_8%)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[color-mix(in_srgb,var(--semantic-error)_88%,#000_12%)]"
						disabled={removeSubmitting}
						onclick={openRemoveConfirm}
					>
						{removeSubmitting ? 'Removing…' : removeButtonLabel}
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if confirmRemoveOpen}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-md"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-remove-students-title"
			tabindex="-1"
			onclick={(e) => e.target === e.currentTarget && !removeSubmitting && closeRemoveConfirm()}
			onkeydown={(e) => e.key === 'Escape' && !removeSubmitting && closeRemoveConfirm()}
		>
			<div
				class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
				role="document"
				onclick={(e) => e.stopPropagation()}
			>
				<h2 id="confirm-remove-students-title" class="text-lg font-bold text-[var(--sh-section-title)]">
					Are you sure?
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
					Remove
					<span class="font-semibold text-[var(--sh-section-title)]">
						{confirmRemoveCount}
						{confirmRemoveCount === 1 ? 'student' : 'students'}
					</span>
					from
					<span class="font-semibold text-[var(--sh-section-title)]">
						{teacherName || 'this teacher'}
					</span>? They will no longer be linked to this teacher.
				</p>
				<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button
						type="button"
						class="rounded-xl border border-[var(--sh-exam-card-border)] px-4 py-2.5 text-sm font-semibold text-[var(--sh-section-title)]"
						disabled={removeSubmitting}
						onclick={closeRemoveConfirm}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-xl border border-[color-mix(in_srgb,var(--semantic-error)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_92%,#fff_8%)] px-4 py-2.5 text-sm font-semibold text-white dark:bg-[color-mix(in_srgb,var(--semantic-error)_88%,#000_12%)]"
						disabled={removeSubmitting}
						onclick={() => void handleRemove()}
					>
						{removeSubmitting ? 'Removing…' : 'Yes, remove'}
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
