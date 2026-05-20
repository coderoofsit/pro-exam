<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 6 }: { count?: number } = $props();
</script>

<div
	class="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]"
	aria-busy="true"
	aria-label="Loading questions"
>
	<div class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden px-2 sm:px-4 md:px-6">
		<div class="shrink-0 px-2 py-2.5">
			<div
				class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
			>
				<div class="-ml-1 flex flex-col gap-1.5">
					<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
					<Skeleton width="w-10" height="h-3.5" className="hidden sm:block" />
				</div>
				<div
					class="flex w-full flex-nowrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4"
				>
					<Skeleton width="w-10" height="h-3.5" className="sm:hidden" />
					<div
						class="hidden items-center rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-1 shadow-sm sm:flex"
					>
						<Skeleton width="w-14" height="h-7" rounded="rounded-md" />
						<Skeleton width="w-20" height="h-7" rounded="rounded-md" className="mx-0.5" />
						<Skeleton width="w-20" height="h-7" rounded="rounded-md" />
					</div>
					<Skeleton width="w-24" height="h-8" rounded="rounded-lg" />
				</div>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto py-3">
			<div class="flex flex-col gap-4">
				{#each Array(count) as _, i (i)}
					<div class="skel-card rounded-xl px-4 py-3.5">
						<div class="flex items-baseline gap-2">
							<Skeleton width="w-6" height="h-4" className="shrink-0" />
							<div class="min-w-0 flex-1 space-y-2">
								<Skeleton width="w-full" height="h-4" />
								<Skeleton width="w-[92%]" height="h-4" />
								{#if i === 2}
									<Skeleton
										width="w-full"
										height="h-24"
										rounded="rounded-lg"
										className="mt-1"
									/>
								{/if}
								<Skeleton width="w-4/5" height="h-4" />
							</div>
						</div>
						{#if i < 3}
							<Skeleton
								width="w-44"
								height="h-5"
								rounded="rounded"
								className="mt-2"
							/>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
