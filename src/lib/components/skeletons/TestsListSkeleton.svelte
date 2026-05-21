<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 5 }: { rowCount?: number } = $props();
</script>

<!-- Tests hub list only — CTAs + search stay visible on +page.svelte -->
<div class="flex flex-col gap-3" aria-hidden="true" aria-busy="true">
	{#each Array(rowCount) as _, i (i)}
		<div
			class="skel-card flex flex-col gap-2 rounded-xl px-3 py-3 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex-1 space-y-1.5 sm:space-y-2">
				<Skeleton width="w-3/4" height="h-4 sm:h-5" strong />
				<Skeleton width="w-1/2" height="h-2.5 sm:h-3" />
			</div>
			<Skeleton width="w-full max-w-[8.5rem] sm:w-32" height="h-9 sm:h-10" rounded="rounded-xl" />
		</div>
	{/each}
</div>
