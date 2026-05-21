<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 3 }: { rowCount?: number } = $props();
</script>

<!-- Mirrors payment history table on subscription/+page.svelte -->
<div
	class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]"
	aria-hidden="true"
	aria-busy="true"
>
	<div
		class="grid grid-cols-4 gap-3 border-b border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] px-4 py-3 sm:grid-cols-5"
	>
		{#each Array(5) as _, i (i)}
			<Skeleton width="w-full" height="h-3.5" className={i === 4 ? 'hidden sm:block' : ''} />
		{/each}
	</div>
	{#each Array(rowCount) as _, i (i)}
		<div
			class="grid grid-cols-4 gap-3 border-b border-[color-mix(in_srgb,var(--sh-exam-card-border)_70%,transparent)] px-4 py-3 last:border-0 sm:grid-cols-5"
		>
			<Skeleton width="w-full" height="h-4" />
			<Skeleton width="w-full" height="h-4" />
			<Skeleton width="w-16" height="h-5" rounded="rounded-full" />
			<Skeleton width="w-full" height="h-4" />
			<Skeleton width="w-full" height="h-4" className="hidden sm:block" />
		</div>
	{/each}
</div>
