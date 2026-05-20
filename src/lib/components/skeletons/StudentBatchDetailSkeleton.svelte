<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="mx-auto w-full max-w-6xl space-y-5 px-4 py-4" aria-hidden="true">
	<div class="skel-card rounded-2xl p-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="space-y-2">
				<Skeleton width="w-52" height="h-7" strong />
				<Skeleton width="w-36" height="h-3" />
			</div>
			<Skeleton width="w-32" height="h-9" rounded="rounded-xl" />
		</div>
	</div>

	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(6) as _, i (i)}
			<div class="skel-card rounded-2xl p-4">
				<div class="mb-3 flex items-center justify-between gap-2">
					<Skeleton width="w-40" height="h-5" strong />
					<Skeleton width="w-16" height="h-5" rounded="rounded-full" />
				</div>
				<div class="space-y-2">
					<Skeleton width="w-2/3" height="h-3" />
					<Skeleton width="w-1/2" height="h-3" />
				</div>
				<div class="mt-4 flex gap-2">
					<Skeleton width="w-24" height="h-8" rounded="rounded-lg" />
					<Skeleton width="w-20" height="h-8" rounded="rounded-lg" />
				</div>
			</div>
		{/each}
	</div>
</div>
