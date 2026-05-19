<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 10 }: { count?: number } = $props();
</script>

<div class="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading questions">
	{#each Array(count) as _, i (i)}
		<div class="skel-card rounded-xl px-4 py-3">
			<div class="flex items-baseline gap-3">
				<Skeleton width="w-8" height="h-4" className="shrink-0" />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton width="w-full" height="h-4" />
					<Skeleton width="w-3/4" height="h-4" />
				</div>
			</div>
		</div>
	{/each}
</div>
