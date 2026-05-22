<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';

	let {
		showBack = false,
		showCount = true,
		cardMinHeight = 'min-h-[92px] sm:min-h-[128px]',
		tileClass = 'skel-card' as const
	}: {
		showBack?: boolean;
		showCount?: boolean;
		cardMinHeight?: string;
		tileClass?: 'skel-exam-tile' | 'skel-card';
	} = $props();
</script>

<div class="exam-page--student mx-auto max-w-7xl min-w-0 px-4 pt-[19px] pb-8 sm:pt-[23px]">
	{#if showBack}
		<div class="mb-1.5 flex justify-start">
			<Skeleton width="w-9 sm:w-24" height="h-9" rounded="rounded-lg" strong />
		</div>
	{/if}
	{#if showCount}
		<Skeleton width="w-28 sm:w-32" height="h-3.5" className="mb-1.5 sm:mb-2" />
	{/if}
	<div class="exam-card-responsive-grid exam-page__grid min-w-0">
		<ExamGridSkeleton nested {tileClass} {cardMinHeight} />
	</div>
</div>
