<script lang="ts">
	import Skeleton, { EXAM_CARD_SKELETON_COUNT } from '$lib/components/Skeleton.svelte';

	let {
		count = EXAM_CARD_SKELETON_COUNT,
		/** Default tile heights: compact on small screens to match dashboard exam cards. */
		cardMinHeight = 'min-h-[92px] sm:min-h-[118px]',
		tileClass = 'skel-exam-tile',
		/** Parent already uses `.exam-card-responsive-grid`; avoid nested grids that shrink to one cell. */
		nested = false
	}: {
		count?: number;
		cardMinHeight?: string;
		/** `skel-exam-tile` for dashboard; `skel-card` for exams list page. */
		tileClass?: 'skel-exam-tile' | 'skel-card';
		nested?: boolean;
	} = $props();
</script>

<div
	class={nested ? 'contents min-w-0' : 'exam-card-responsive-grid min-w-0'}
	aria-hidden="true"
>
	{#each Array(count) as _, i (i)}
		<div
			class="{tileClass} flex {cardMinHeight} flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center sm:gap-2 sm:rounded-xl sm:px-3 sm:py-3"
		>
			<Skeleton
				width="w-[1.9rem] sm:w-9"
				height="h-[1.9rem] sm:h-9"
				rounded="rounded-full"
				strong
			/>
			<Skeleton width="max-w-[4.25rem] w-full sm:max-w-none sm:w-20" height="h-2.5 sm:h-3" />
		</div>
	{/each}
</div>
