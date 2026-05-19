<script lang="ts">
	import { get } from 'svelte/store';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import {
		fetchUserViewDetails,
		unwrapUserViewDetails,
		type UserViewDetailsPayload,
		type UserViewDetailsRole,
		type UserViewDetailsTestEntry
	} from '$lib/api/userViewDetails';
	import { authStore } from '$lib/stores/auth';

	let {
		open = false,
		userId = null as string | null,
		userName = '',
		role = 'teacher' as UserViewDetailsRole,
		basePath = '/institute',
		onClose
	}: {
		open: boolean;
		userId: string | null;
		userName?: string;
		role: UserViewDetailsRole;
		basePath?: string;
		onClose: () => void;
	} = $props();

	let loading = $state(false);
	let error = $state('');
	let details = $state<UserViewDetailsPayload | null>(null);
	let activeTab = $state<'batches' | 'tests'>('batches');

	function formatWhen(iso?: string): string {
		if (!iso) return '—';
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleString(undefined, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function testTitle(entry: UserViewDetailsTestEntry): string {
		const name = entry.test?.name;
		if (typeof name === 'string') return name;
		return name?.en || name?.hi || entry.test?.slug || 'Untitled test';
	}

	function statusClass(status?: string): string {
		const s = (status ?? '').toUpperCase();
		if (s === 'ACTIVE' || s === 'STARTED') {
			return 'border-[color-mix(in_srgb,var(--whatsapp-brand)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--whatsapp-brand)_12%,transparent)] text-[color-mix(in_srgb,var(--whatsapp-brand)_90%,#fff_10%)]';
		}
		return 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] text-[var(--page-text-muted)]';
	}

	$effect(() => {
		if (!open || !userId?.trim()) return;
		const id = userId.trim();
		const r = role;
		loading = true;
		error = '';
		details = null;
		activeTab = 'batches';

		const token = get(authStore).token;
		void fetchUserViewDetails({ userId: id, role: r, token, fetchFn: fetch }).then((res) => {
			loading = false;
			const payload = unwrapUserViewDetails(res);
			if (!payload) {
				error = res.message || 'Failed to load user details';
				return;
			}
			details = payload;
		});
	});
</script>

{#if open && userId}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="user-view-details-title"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && onClose()}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	>
		<div
			class="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] shadow-xl"
			role="document"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--sh-exam-card-border)] px-5 py-4">
				<div class="min-w-0">
					<h2 id="user-view-details-title" class="text-lg font-bold text-[var(--sh-section-title)]">
						{userName || (role === 'teacher' ? 'Teacher' : 'Student')} details
					</h2>
					<p class="mt-0.5 text-xs capitalize text-[var(--sh-ai-sub)]">{role}</p>
				</div>
				<button
					type="button"
					class="shrink-0 rounded-lg border border-[var(--sh-exam-card-border)] px-2.5 py-1 text-sm text-[var(--page-text)]"
					onclick={onClose}
				>
					Close
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				{#if loading}
					<div class="space-y-3">
						<Skeleton width="w-full" height="h-14" />
						<Skeleton width="w-full" height="h-24" />
						<Skeleton width="w-full" height="h-24" />
					</div>
				{:else if error}
					<p class="rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-sm text-[var(--pc-error-text)]">
						{error}
					</p>
				{:else if details}
					<div class="grid grid-cols-2 gap-3">
						<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2 text-center">
							<p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--page-text-muted)]">Batches</p>
							<p class="mt-0.5 text-xl font-bold tabular-nums text-[var(--page-text)]">
								{details.summary?.totalBatches ?? details.batches?.length ?? 0}
							</p>
						</div>
						<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2 text-center">
							<p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--page-text-muted)]">Tests in batches</p>
							<p class="mt-0.5 text-xl font-bold tabular-nums text-[var(--page-text)]">
								{details.summary?.totalTestsCreatedInBatches ?? details.tests?.length ?? 0}
							</p>
						</div>
					</div>

					<div class="mt-4 grid grid-cols-2 border-b border-[var(--sh-exam-card-border)]" role="tablist">
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'batches'}
							class="border-b-2 px-2 py-2 text-sm font-semibold transition-colors {activeTab === 'batches'
								? 'border-[var(--page-link)] text-[var(--page-link)]'
								: 'border-transparent text-[var(--page-text-muted)]'}"
							onclick={() => (activeTab = 'batches')}
						>
							Batches ({details.batches?.length ?? 0})
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === 'tests'}
							class="border-b-2 px-2 py-2 text-sm font-semibold transition-colors {activeTab === 'tests'
								? 'border-[var(--page-link)] text-[var(--page-link)]'
								: 'border-transparent text-[var(--page-text-muted)]'}"
							onclick={() => (activeTab = 'tests')}
						>
							Tests ({details.tests?.length ?? 0})
						</button>
					</div>

					{#if activeTab === 'batches'}
						<ul class="mt-3 space-y-2" role="list">
							{#each details.batches ?? [] as batch (batch._id)}
								<li>
									<a
										href="{basePath}/batch/{batch.slug}"
										class="block rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2.5 transition-colors hover:border-[var(--page-link)]"
										onclick={onClose}
									>
										<div class="flex flex-wrap items-center justify-between gap-2">
											<p class="font-semibold text-[var(--page-text)]">{batch.name}</p>
											<span class={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(batch.status)}`}>
												{batch.status ?? '—'}
											</span>
										</div>
										<p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
											{batch.numberOfStudents ?? 0} students · {batch.numberOfTeachers ?? 0} teachers ·
											{batch.numberOfTests ?? 0} tests
										</p>
										<p class="mt-1 text-[11px] text-[var(--page-text-muted)]">
											{formatWhen(batch.startsAt)} — {formatWhen(batch.endsAt)}
										</p>
									</a>
								</li>
							{:else}
								<li class="py-6 text-center text-xs text-[var(--sh-ai-sub)]">No batches found.</li>
							{/each}
						</ul>
					{:else}
						<ul class="mt-3 space-y-2" role="list">
							{#each details.tests ?? [] as entry, i (`${entry.test?._id ?? i}-${entry.batch?._id ?? ''}`)}
								<li class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2.5">
									<p class="text-xs font-medium text-[var(--page-text-muted)]">{entry.batch?.name ?? 'Batch'}</p>
									<p class="mt-0.5 font-semibold text-[var(--page-text)]">{testTitle(entry)}</p>
									<div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--sh-ai-sub)]">
										<span>{entry.test?.questionCount ?? 0} questions</span>
										<span>·</span>
										<span>{entry.test?.totalMarks ?? 0} marks</span>
										{#if entry.test?.kind}
											<span>·</span>
											<span>{entry.test.kind}</span>
										{/if}
										<span
											class={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusClass(entry.test?.status)}`}
										>
											{entry.test?.status ?? '—'}
										</span>
									</div>
								</li>
							{:else}
								<li class="py-6 text-center text-xs text-[var(--sh-ai-sub)]">No tests found.</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
