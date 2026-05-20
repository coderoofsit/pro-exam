<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { chapterCount = 9 }: { chapterCount?: number } = $props();
</script>

<div
	class="flex h-full w-full bg-[var(--page-bg)]"
	aria-busy="true"
	aria-label="Loading chapters"
>
	<aside
		class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)] md:flex"
	>
		<div class="flex-1 overflow-y-auto p-2">
			<Skeleton width="w-20" height="h-9" rounded="rounded-lg" className="mb-3" />
			<Skeleton width="w-24" height="h-3" className="mb-3 opacity-70" />
			<nav class="space-y-1.5">
				{#each Array(5) as _, i (i)}
					<Skeleton width="w-full" height="h-9" rounded="rounded-lg" />
				{/each}
			</nav>
		</div>
	</aside>

	<main class="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
		<Skeleton width="w-20" height="h-9" rounded="rounded-lg" className="mb-3 md:hidden" />
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
			{#each Array(chapterCount) as _, i (i)}
				<div
					class="skel-card flex min-h-[76px] flex-col justify-between rounded-[var(--radius-card)] p-2.5 sm:min-h-[88px] sm:p-3"
				>
					<Skeleton width="w-full" height="h-4" strong />
					<Skeleton width="w-28" height="h-3" className="mt-3" />
				</div>
			{/each}
		</div>
	</main>
</div>
