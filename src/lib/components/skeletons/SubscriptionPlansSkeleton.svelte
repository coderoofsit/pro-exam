<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 3 }: { count?: number } = $props();
</script>

<!-- Mirrors “Upgrade plans” grid on subscription/+page.svelte -->
<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true" aria-busy="true">
	{#each Array(count) as _, i (i)}
		<div
			class="flex min-h-[11rem] flex-col rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4"
		>
			<div class="mb-2 flex items-start justify-between gap-2">
				<Skeleton width="w-28" height="h-5" strong />
				<Skeleton width="w-4" height="h-4" rounded="rounded" className="shrink-0" />
			</div>
			<Skeleton width="w-16" height="h-3" />
			<Skeleton width="w-24" height="h-8" className="mt-2" strong />
			<div class="mt-4 flex-1 space-y-2">
				<div class="flex gap-2">
					<Skeleton width="w-3" height="h-3" rounded="rounded" className="shrink-0" />
					<Skeleton width="w-full" height="h-3" />
				</div>
				<div class="flex gap-2">
					<Skeleton width="w-3" height="h-3" rounded="rounded" className="shrink-0" />
					<Skeleton width="w-11/12" height="h-3" />
				</div>
				<div class="flex gap-2">
					<Skeleton width="w-3" height="h-3" rounded="rounded" className="shrink-0" />
					<Skeleton width="w-9/12" height="h-3" />
				</div>
			</div>
		</div>
	{/each}
</div>
