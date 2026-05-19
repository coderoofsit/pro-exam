<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="own-test-chapters-root flex flex-col" aria-hidden="true">
	<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
		<aside class="flex w-full shrink-0 flex-col gap-2 lg:w-[260px]">
			{#each Array(4) as _, i (i)}
				<div class="skel-card rounded-2xl p-4">
					<Skeleton width="w-3/4" height="h-4" strong />
					<Skeleton width="w-20" height="h-3" className="mt-2" />
				</div>
			{/each}
		</aside>

		<div class="min-w-0 flex-1 space-y-3">
			{#each Array(5) as _, i (i)}
				<div class="skel-card rounded-2xl p-4">
					<div class="flex items-center justify-between gap-3">
						<Skeleton width="w-1/2" height="h-5" strong />
						<Skeleton width="w-16" height="h-3" />
					</div>
					<div class="mt-3 space-y-2 border-t border-[var(--skel-border)] pt-3">
						{#each Array(2) as __, j (j)}
							<div class="flex items-center gap-2 rounded-xl border border-[var(--skel-border)] p-3">
								<Skeleton width="w-full" height="h-4" />
								<Skeleton width="w-8" height="h-8" rounded="rounded-lg" className="shrink-0" />
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
