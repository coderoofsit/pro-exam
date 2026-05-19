<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
	{#each Array(count) as _, i (i)}
		<div class="skel-card rounded-2xl p-5">
			<Skeleton width="w-12" height="h-12" rounded="rounded-xl" className="mb-4" strong />
			<Skeleton width="w-3/4" height="h-6" className="mb-2" strong />
			<Skeleton width="w-1/2" height="h-4" />
		</div>
	{/each}
</div>
