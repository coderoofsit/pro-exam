<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 5 }: { rowCount?: number } = $props();
</script>

<div class="student-tests-page mx-auto max-w-5xl space-y-4 px-3 py-3 sm:px-5" aria-hidden="true">
	<section>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each Array(2) as _, i (i)}
				<div class="skel-cta-tile flex min-h-[72px] items-center gap-3 rounded-xl px-4 py-4">
					<Skeleton width="w-11" height="h-11" rounded="rounded-xl" strong />
					<Skeleton width="w-28" height="h-4" strong />
					<Skeleton width="w-10" height="h-4" rounded="rounded-md" className="ml-auto shrink-0" />
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-3 space-y-4">
		<Skeleton width="w-36" height="h-3" />
		<div class="flex flex-col gap-3">
			{#each Array(rowCount) as _, i (i)}
				<div
					class="skel-card flex flex-col gap-4 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex-1 space-y-2">
						<Skeleton width="w-3/4" height="h-5" strong />
						<Skeleton width="w-1/2" height="h-3" />
					</div>
					<Skeleton width="w-32" height="h-10" rounded="rounded-xl" />
				</div>
			{/each}
		</div>
	</section>
</div>
