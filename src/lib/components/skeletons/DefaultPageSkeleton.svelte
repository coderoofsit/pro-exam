<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-4" aria-hidden="true">
	<Skeleton width="w-48" height="h-8" />
	<Skeleton width="w-full max-w-xl" height="h-4" />
	<div class="grid gap-4 md:grid-cols-2">
		{#each Array(4) as _, i (i)}
			<div
				class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5"
			>
				<Skeleton width="w-2/3" height="h-5" className="mb-3" />
				<Skeleton width="w-full" height="h-3" className="mb-2" />
				<Skeleton width="w-5/6" height="h-3" />
			</div>
		{/each}
	</div>
</div>
