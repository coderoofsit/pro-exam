<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="subscription-page mx-auto max-w-5xl space-y-4 px-4 py-2" aria-hidden="true">
	<Skeleton width="w-48" height="h-8" className="mb-2" />
	<Skeleton width="w-64" height="h-4" className="mb-6" />
	<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5">
		<div class="flex flex-wrap gap-2">
			<Skeleton width="w-24" height="h-6" rounded="rounded-full" />
			<Skeleton width="w-16" height="h-6" rounded="rounded-full" />
			<Skeleton width="w-14" height="h-6" rounded="rounded-full" />
		</div>
		<Skeleton width="w-40" height="h-7" className="mt-4" />
		<Skeleton width="w-56" height="h-4" className="mt-2" />
		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			<Skeleton width="w-full" height="h-10" />
			<Skeleton width="w-full" height="h-10" />
		</div>
	</div>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(3) as _, i (i)}
			<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4">
				<Skeleton width="w-28" height="h-5" />
				<Skeleton width="w-20" height="h-3" className="mt-2" />
				<Skeleton width="w-24" height="h-7" className="mt-3" />
				<div class="mt-3 space-y-2">
					<Skeleton width="w-full" height="h-3" />
					<Skeleton width="w-11/12" height="h-3" />
					<Skeleton width="w-9/12" height="h-3" />
				</div>
			</div>
		{/each}
	</div>
</div>
