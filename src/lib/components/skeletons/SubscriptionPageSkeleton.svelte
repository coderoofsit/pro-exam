<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="subscription-page mx-auto max-w-5xl space-y-4 px-3 py-2 sm:space-y-6 sm:px-4" aria-hidden="true">
	<header class="text-center">
		<Skeleton width="w-40 sm:w-48" height="h-5 sm:h-6" rounded="rounded-full" className="mx-auto mb-2 sm:mb-3" />
		<Skeleton width="w-full max-w-lg" height="h-8 sm:h-9" className="mx-auto" strong />
		<Skeleton width="w-full max-w-md" height="h-3.5 sm:h-4" className="mx-auto mt-3 sm:mt-4" />
	</header>

	<div class="skel-card rounded-xl p-4 sm:rounded-2xl sm:p-6">
		<Skeleton width="w-28" height="h-3" />
		<Skeleton width="w-40" height="h-5" className="mt-2" strong />
		<Skeleton width="w-full max-w-sm" height="h-3" className="mt-2" />
	</div>

	<div class="skel-card rounded-xl p-4 sm:rounded-2xl sm:p-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<Skeleton width="w-32 sm:w-36" height="h-3" />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<div class="mt-4 rounded-lg border border-[var(--skel-border)] bg-[var(--skel-surface)] p-3 sm:mt-6 sm:rounded-xl sm:p-5">
			<div class="flex flex-wrap gap-2">
				<Skeleton width="w-24" height="h-6" rounded="rounded-full" />
				<Skeleton width="w-16" height="h-6" rounded="rounded-full" />
				<Skeleton width="w-14" height="h-6" rounded="rounded-full" />
			</div>
			<Skeleton width="w-40" height="h-7" className="mt-4" strong />
			<Skeleton width="w-56" height="h-4" className="mt-2" />
			<div class="mt-4 grid gap-3 sm:mt-6 sm:gap-4 sm:grid-cols-2">
				<Skeleton width="w-full" height="h-10" rounded="rounded-lg" />
				<Skeleton width="w-full" height="h-10" rounded="rounded-lg" />
			</div>
		</div>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
		{#each Array(3) as _, i (i)}
			<div class="skel-card rounded-lg p-3 sm:rounded-xl sm:p-4">
				<Skeleton width="w-28" height="h-5" strong />
				<Skeleton width="w-20" height="h-3" className="mt-2" />
				<Skeleton width="w-24" height="h-7" className="mt-3" strong />
				<div class="mt-3 space-y-2">
					<Skeleton width="w-full" height="h-3" />
					<Skeleton width="w-11/12" height="h-3" />
					<Skeleton width="w-9/12" height="h-3" />
				</div>
			</div>
		{/each}
	</div>
</div>
