<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 5 }: { rowCount?: number } = $props();
</script>

<div class="student-tests-page mx-auto max-w-5xl space-y-4 px-3 py-3 sm:px-5" aria-hidden="true">
	<section>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
			{#each Array(2) as _, i (i)}
				<div
					class="skel-cta-tile flex min-h-[60px] items-center gap-2 rounded-lg px-3 py-2.5 sm:min-h-[72px] sm:gap-3 sm:rounded-xl sm:px-4 sm:py-4"
				>
					<Skeleton width="w-9 sm:w-11" height="h-9 sm:h-11" rounded="rounded-lg sm:rounded-xl" strong />
					<Skeleton width="w-24 sm:w-28" height="h-3.5 sm:h-4" strong />
					<Skeleton width="w-8 sm:w-10" height="h-3.5 sm:h-4" rounded="rounded-md" className="ml-auto shrink-0" />
				</div>
			{/each}
		</div>
	</section>

	<section class="mt-3 space-y-4">
		<Skeleton width="w-36" height="h-3" />
		<div class="flex flex-col gap-3">
			{#each Array(rowCount) as _, i (i)}
				<div
					class="skel-card flex flex-col gap-2 rounded-xl px-3 py-3 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex-1 space-y-1.5 sm:space-y-2">
						<Skeleton width="w-3/4" height="h-4 sm:h-5" strong />
						<Skeleton width="w-1/2" height="h-2.5 sm:h-3" />
					</div>
					<Skeleton width="w-full max-w-[8.5rem] sm:w-32" height="h-9 sm:h-10" rounded="rounded-xl" />
				</div>
			{/each}
		</div>
	</section>
</div>
