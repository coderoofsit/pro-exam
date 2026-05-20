<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl p-4 min-w-0" aria-hidden="true">
	<section class="min-w-0">
		<div class="mb-3 flex min-w-0 items-center justify-between gap-2">
			<Skeleton width="w-32 sm:w-40" height="h-5" strong />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<div class="exam-card-responsive-grid min-w-0">
			<ExamGridSkeleton nested />
		</div>
	</section>

	<section class="mt-2 min-w-0">
		<div class="mb-2 flex min-w-0 items-center justify-between gap-2">
			<Skeleton width="w-36 sm:w-44" height="h-5" strong />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<div class="exam-card-responsive-grid min-w-0">
			<ExamGridSkeleton nested />
		</div>
	</section>

	<section class="mt-6 min-w-0">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{#each Array(3) as _, i (i)}
				<div
					class="skel-cta-tile flex min-h-[60px] items-center gap-2 rounded-lg px-3 py-2.5 sm:min-h-[72px] sm:gap-3 sm:rounded-xl sm:px-4 sm:py-4"
				>
					<Skeleton width="w-9 sm:w-11" height="h-9 sm:h-11" rounded="rounded-lg sm:rounded-xl" strong />
					<Skeleton width="w-24 sm:w-32" height="h-3.5 sm:h-4" strong />
					<Skeleton width="w-8 sm:w-10" height="h-3.5 sm:h-4" rounded="rounded-md" className="ml-auto shrink-0" />
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-6 min-w-0">
		<div class="skel-card flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:rounded-2xl sm:p-4">
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
