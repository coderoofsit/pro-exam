<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl p-4 min-w-0" aria-hidden="true">
	<section
		class="mb-6 mt-2 rounded-2xl border border-[color-mix(in_srgb,var(--accent-cta-cyan)_20%,var(--sh-exam-card-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--sh-exam-card-bg)_94%,transparent),color-mix(in_srgb,var(--accent-cta-cyan)_6%,var(--sh-exam-card-bg)))] p-5"
	>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton width="w-16" height="h-3" />
				<Skeleton width="w-48 sm:w-64" height="h-7" />
				<Skeleton width="w-44 sm:w-56" height="h-4" />
			</div>
			<div class="flex flex-wrap gap-2">
				{#each Array(4) as _, i (i)}
					<Skeleton width="w-20" height="h-6" rounded="rounded-full" />
				{/each}
			</div>
		</div>
	</section>

	<div class="mb-3 flex items-center justify-between gap-2">
		<Skeleton width="w-40" height="h-5" />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<ExamGridSkeleton count={7} />

	<div class="mb-2 mt-6 flex items-center justify-between gap-2">
		<Skeleton width="w-44" height="h-5" />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<ExamGridSkeleton count={7} />
</div>
