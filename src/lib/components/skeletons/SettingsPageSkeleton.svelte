<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6" aria-hidden="true">
	<div>
		<Skeleton width="w-28" height="h-7" strong />
		<Skeleton width="w-44" height="h-4" className="mt-2" />
	</div>

	<div class="skel-card flex items-start gap-3 rounded-xl px-4 py-3 sm:gap-4 sm:rounded-2xl sm:px-5 sm:py-4">
		<Skeleton width="w-12 sm:w-14" height="h-12 sm:h-14" rounded="rounded-lg sm:rounded-xl" strong />
		<div class="min-w-0 flex-1 space-y-2">
			<Skeleton width="w-40" height="h-5" strong />
			<Skeleton width="w-20" height="h-3" />
			<div class="flex flex-wrap gap-1.5 pt-1">
				<Skeleton width="w-16" height="h-5" rounded="rounded-lg" />
				<Skeleton width="w-20" height="h-5" rounded="rounded-lg" />
			</div>
		</div>
	</div>

	<Skeleton width="w-16" height="h-3" />
	<div class="skel-card overflow-hidden rounded-2xl">
		{#each Array(2) as _, i (i)}
			<div
				class="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 {i === 0
					? 'border-b border-[var(--skel-border)]'
					: ''}"
			>
				<div class="space-y-2">
					<Skeleton width="w-12" height="h-3" />
					<Skeleton width="w-44" height="h-4" strong />
				</div>
				<Skeleton width="w-16" height="h-4" />
			</div>
		{/each}
	</div>
</div>
