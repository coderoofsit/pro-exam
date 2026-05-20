<script lang="ts">
	import Skeleton, { EXAM_CARD_SKELETON_COUNT } from '$lib/components/Skeleton.svelte';

	let {
		count = EXAM_CARD_SKELETON_COUNT,
		cardMinHeight = 'min-h-[118px]',
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
			class="{tileClass} flex {cardMinHeight} flex-col items-center justify-center gap-2 rounded-xl px-3 py-3 text-center"
		>
			<Skeleton width="w-9" height="h-9" rounded="rounded-full" strong />
			<Skeleton width="w-20" height="h-3" />
		</div>
	{/each}
</div>
