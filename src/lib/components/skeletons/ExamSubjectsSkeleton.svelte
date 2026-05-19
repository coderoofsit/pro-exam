<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<div class="flex flex-1 flex-col py-1" aria-busy="true" aria-label="Loading subjects">
	<div class="mb-4 flex items-center gap-4">
		<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
		<Skeleton width="w-48" height="h-8" strong />
	</div>
	<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(count) as _, i (i)}
			<div class="skel-card flex h-20 flex-col justify-center rounded-[var(--radius-card)] p-3">
				<Skeleton width="w-3/4" height="h-4" strong />
				<Skeleton width="w-1/2" height="h-3" className="mt-2" />
			</div>
		{/each}
	</div>
</div>
