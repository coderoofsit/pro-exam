<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div
	class="flex h-full min-h-0 flex-col gap-4 rounded-none sm:rounded-2xl border-x-0 sm:border-x border-[var(--sh-exam-card-border)] bg-[var(--page-bg)] p-2 sm:p-4"
	aria-busy="true"
	aria-label="Loading question"
>
	<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
	<Skeleton width="w-40" height="h-6" strong />
	<div class="space-y-2">
		<Skeleton width="w-full" height="h-4" />
		<Skeleton width="w-full" height="h-4" />
		<Skeleton width="w-2/3" height="h-4" />
	</div>
	<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#each Array(4) as _, i (i)}
			<div class="skel-card h-24 rounded-xl" />
		{/each}
	</div>
</div>
