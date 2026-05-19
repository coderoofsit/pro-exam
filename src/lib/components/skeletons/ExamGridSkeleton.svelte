<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 10, cardMinHeight = 'min-h-[118px]' }: { count?: number; cardMinHeight?: string } =
		$props();
</script>

<div
	class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
	aria-hidden="true"
>
	{#each Array(count) as _, i (i)}
		<div
			class="flex {cardMinHeight} flex-col items-center justify-center gap-2 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-3 text-center"
		>
			<Skeleton width="w-9" height="h-9" rounded="rounded-full" />
			<Skeleton width="w-20" height="h-3" />
		</div>
	{/each}
</div>
