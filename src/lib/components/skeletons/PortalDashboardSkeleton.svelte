<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl min-w-0 p-3 sm:p-4" aria-hidden="true">
	<section
		class="skel-card mb-5 mt-2 rounded-xl border p-4 shadow-[var(--sh-exam-card-hover-shadow)] sm:mb-6 sm:rounded-2xl sm:p-5"
	>
		<div class="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
			<div class="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
				<Skeleton width="w-16" height="h-3" />
				<Skeleton width="w-full max-w-[14rem] sm:w-64" height="h-6 sm:h-7" strong />
				<Skeleton width="w-full max-w-[16rem] sm:w-56" height="h-3.5 sm:h-4" />
			</div>
			<div class="flex flex-wrap gap-2">
				{#each Array(4) as _, i (i)}
					<Skeleton width="w-20" height="h-6" rounded="rounded-full" />
				{/each}
			</div>
		</div>
	</section>

	<div class="mb-3 flex items-center justify-between gap-2">
		<Skeleton width="w-32 sm:w-40" height="h-5" strong />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<div class="exam-card-responsive-grid min-w-0">
		<ExamGridSkeleton nested />
	</div>

	<div class="mb-2 mt-5 flex items-center justify-between gap-2 sm:mt-6">
		<Skeleton width="w-36 sm:w-44" height="h-5" strong />
		<Skeleton width="w-16" height="h-3" />
	</div>
	<div class="exam-card-responsive-grid min-w-0">
		<ExamGridSkeleton nested />
	</div>
</div>
