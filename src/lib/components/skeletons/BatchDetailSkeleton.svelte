<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-4" aria-hidden="true">
	<Skeleton width="w-56" height="h-8" className="mb-2" />
	<Skeleton width="w-72" height="h-4" className="mb-6" />
	<div class="flex flex-wrap gap-2 border-b border-[var(--sh-exam-card-border)] pb-3">
		{#each Array(4) as _, i (i)}
			<Skeleton width="w-24" height="h-9" rounded="rounded-xl" />
		{/each}
	</div>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(6) as _, i (i)}
			<div
				class="rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] p-4"
			>
				<Skeleton width="w-3/4" height="h-5" className="mb-3" />
				<Skeleton width="w-full" height="h-3" className="mb-2" />
				<Skeleton width="w-2/3" height="h-3" className="mb-4" />
				<Skeleton width="w-24" height="h-8" rounded="rounded-xl" />
			</div>
		{/each}
	</div>
</div>
