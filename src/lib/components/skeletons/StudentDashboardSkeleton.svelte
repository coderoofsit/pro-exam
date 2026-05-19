<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl p-4 min-w-0" aria-hidden="true">
	<section class="min-w-0">
		<div class="mb-3 flex min-w-0 items-center justify-between gap-2">
			<Skeleton width="w-40" height="h-5" strong />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<ExamGridSkeleton count={7} />
	</section>

	<section class="mt-2 min-w-0">
		<div class="mb-2 flex min-w-0 items-center justify-between gap-2">
			<Skeleton width="w-44" height="h-5" strong />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<ExamGridSkeleton count={7} />
	</section>

	<section class="mt-6 min-w-0">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each Array(3) as _, i (i)}
				<div class="skel-cta-tile flex min-h-[72px] items-center gap-3 rounded-xl px-4 py-4">
					<Skeleton width="w-11" height="h-11" rounded="rounded-xl" strong />
					<Skeleton width="w-32" height="h-4" strong />
					<Skeleton width="w-10" height="h-4" rounded="rounded-md" className="ml-auto shrink-0" />
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-6 min-w-0">
		<div class="skel-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex min-w-0 items-center gap-3">
				<Skeleton width="w-10" height="h-10" rounded="rounded-xl" strong />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton width="w-48" height="h-4" strong />
					<Skeleton width="w-full max-w-sm" height="h-3" />
				</div>
			</div>
			<Skeleton width="w-28" height="h-10" rounded="rounded-xl" className="shrink-0" />
		</div>
	</section>
</div>
