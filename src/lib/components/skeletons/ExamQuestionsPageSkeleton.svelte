<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<!-- Generic question-bank list shell (e.g. `/questions`, tests view) — not exam chapter route -->
<div
	class="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]"
	aria-busy="true"
	aria-label="Loading questions"
>
	<div class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-2 sm:px-4 md:px-6">
		<div class="shrink-0 px-2 py-2.5">
			<div
				class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
			>
				<div class="-ml-1 flex flex-col gap-1.5 text-sm text-[var(--page-text-muted)]">
					<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
					<Skeleton width="w-12" height="h-3.5" className="hidden sm:block" />
				</div>

				<div
					class="flex flex-1 shrink-0 flex-nowrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4 w-full sm:flex-none"
				>
					<Skeleton width="w-10" height="h-3.5" className="sm:hidden" />

					<div
						class="flex items-center rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-1 shadow-sm"
					>
						<Skeleton width="w-11" height="h-7" rounded="rounded-md" className="shrink-0" />
						<Skeleton width="w-[4.5rem]" height="h-7" rounded="rounded-md" className="mx-0.5 shrink-0" />
						<Skeleton width="w-[5.25rem]" height="h-7" rounded="rounded-md" className="shrink-0" />
					</div>

					<div
						class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--sh-ai-sub)]"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							class="shrink-0 opacity-70"
							aria-hidden="true"
						>
							<path
								d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<Skeleton width="w-24" height="h-4" className="hidden sm:block" />
					</div>
				</div>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto py-2 sm:py-3">
			<div class="flex flex-col gap-2 sm:gap-4">
				{#each Array(count) as _, i (i)}
					<div
						class="question-card rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--sh-tool-card-bg)] px-3 py-2.5 text-left shadow-sm sm:rounded-xl sm:px-4 sm:py-3.5"
					>
						<div class="flex items-baseline gap-1.5 sm:gap-2">
							<Skeleton width="w-6 sm:w-7" height="h-3.5 sm:h-4" className="shrink-0" />
							<div class="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
								<Skeleton width="w-full" height="h-3.5 sm:h-4" />
								<Skeleton width="w-[94%]" height="h-3.5 sm:h-4" />
								<Skeleton width="w-4/5" height="h-3.5 sm:h-4" className="hidden sm:block" />
							</div>
						</div>
						<div class="mt-1.5 pl-0.5">
							<div
								class="inline-flex rounded border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 px-2 py-0.5"
							>
								<Skeleton width="w-40" height="h-3" rounded="rounded" className="opacity-80" />
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
