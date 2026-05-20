<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import BatchDetailTableSkeleton from '$lib/components/skeletons/BatchDetailTableSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-6xl space-y-5 px-4 py-6" aria-hidden="true">
	<header class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
		<div class="min-w-0 space-y-2 sm:justify-self-start">
			<Skeleton width="w-20" height="h-6" rounded="rounded-full" />
			<Skeleton width="w-56" height="h-8" strong />
		</div>
		<Skeleton width="w-[4.5rem]" height="h-9" rounded="rounded-xl" className="sm:justify-self-end" />
	</header>

	<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3">
		<div class="grid grid-cols-1 gap-2 lg:grid-cols-[1.4fr_1fr]">
			<div
				class="rounded-lg border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-3 py-2"
			>
				<Skeleton width="w-16" height="h-3" className="mb-2" />
				<Skeleton width="w-full max-w-xs" height="h-4" />
			</div>
			<div class="grid grid-cols-3 gap-2">
				{#each Array(3) as _, i (i)}
					<div
						class="rounded-lg border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-2 py-2 text-center"
					>
						<Skeleton width="w-12" height="h-3" className="mx-auto mb-2" />
						<Skeleton width="w-8" height="h-5" strong className="mx-auto" />
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<div class="inline-flex rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-1">
			{#each Array(3) as _, i (i)}
				<Skeleton width="w-[4.75rem]" height="h-8" rounded="rounded-lg" className="mx-0.5" />
			{/each}
		</div>
		<Skeleton width="w-full min-w-[260px] sm:w-64" height="h-9" rounded="rounded-xl" className="ml-auto" />
	</div>

	<BatchDetailTableSkeleton rowCount={8} />
</div>
