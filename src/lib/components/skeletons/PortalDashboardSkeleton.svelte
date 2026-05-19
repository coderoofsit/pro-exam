<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl min-w-0 p-4" aria-hidden="true">
	<section
		class="skel-card mb-6 mt-2 rounded-2xl border p-5 shadow-[var(--sh-exam-card-hover-shadow)]"
	>
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton width="w-16" height="h-3" />
				<Skeleton width="w-48 sm:w-64" height="h-7" strong />
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
		<Skeleton width="w-40" height="h-5" strong />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<ExamGridSkeleton count={7} />

	<div class="mb-2 mt-6 flex items-center justify-between gap-2">
		<Skeleton width="w-44" height="h-5" strong />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<ExamGridSkeleton count={7} />
</div>
