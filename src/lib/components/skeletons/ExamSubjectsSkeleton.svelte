<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<div class="flex flex-1 flex-col py-1" aria-busy="true" aria-label="Loading subjects">
	<div class="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-4">
		<Skeleton width="w-16 sm:w-20" height="h-8 sm:h-9" rounded="rounded-lg" />
		<Skeleton width="w-36 sm:w-48" height="h-7 sm:h-8" strong />
	</div>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
		{#each Array(count) as _, i (i)}
			<div
				class="skel-card flex min-h-[4.5rem] flex-col justify-center rounded-[var(--radius-card)] p-2.5 sm:h-20 sm:p-3"
			>
				<Skeleton width="w-3/4" height="h-4" strong />
				<Skeleton width="w-1/2" height="h-3" className="mt-2" />
			</div>
		{/each}
	</div>
</div>
