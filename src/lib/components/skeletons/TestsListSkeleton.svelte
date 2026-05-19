<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 5 }: { rowCount?: number } = $props();
</script>

<div class="mx-auto w-full max-w-7xl space-y-4 px-4 py-2" aria-hidden="true">
	<Skeleton width="w-40" height="h-6" className="mb-2" />
	<div class="flex flex-col gap-3">
		{#each Array(rowCount) as _, i (i)}
			<div
				class="flex flex-col gap-4 rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="flex-1 space-y-2">
					<Skeleton width="w-3/4" height="h-5" />
					<Skeleton width="w-1/2" height="h-3" />
				</div>
				<Skeleton width="w-32" height="h-10" rounded="rounded-xl" />
			</div>
		{/each}
	</div>
</div>
