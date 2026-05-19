<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ManagementTableSkeleton from '$lib/components/ManagementTableSkeleton.svelte';
</script>

<div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-4" aria-hidden="true">
	<div class="skel-card rounded-2xl p-5">
		<Skeleton width="w-56" height="h-8" className="mb-4" strong />
		<div class="grid gap-4 sm:grid-cols-3">
			{#each Array(3) as _, i (i)}
				<div class="space-y-2">
					<Skeleton width="w-20" height="h-3" />
					<Skeleton width="w-12" height="h-6" strong />
				</div>
			{/each}
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-2 border-b border-[var(--skel-border)] pb-3">
		{#each ['Teachers', 'Students', 'Tests'] as _}
			<Skeleton width="w-24" height="h-9" rounded="rounded-xl" />
		{/each}
	</div>

	<div class="flex flex-wrap gap-3">
		<Skeleton width="w-full max-w-md" height="h-10" rounded="rounded-xl" />
		<Skeleton width="w-28" height="h-10" rounded="rounded-xl" />
	</div>

	<ManagementTableSkeleton rowCount={6} showStatusColumn={false} />
</div>
