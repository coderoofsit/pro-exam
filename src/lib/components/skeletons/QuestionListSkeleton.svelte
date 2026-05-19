<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<div class="space-y-3 pb-24" aria-hidden="true">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<Skeleton width="w-48" height="h-6" />
		<Skeleton width="w-28" height="h-9" rounded="rounded-lg" />
	</div>
	{#each Array(count) as _, i (i)}
		<div
			class="rounded-2xl border border-[var(--own-question-border)] bg-[var(--own-question-bg)] p-4"
		>
			<div class="flex gap-3">
				<Skeleton width="w-5" height="h-5" rounded="rounded" className="shrink-0" />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton width="w-full" height="h-4" />
					<Skeleton width="w-11/12" height="h-4" />
					<Skeleton width="w-4/5" height="h-4" />
				</div>
			</div>
		</div>
	{/each}
</div>
