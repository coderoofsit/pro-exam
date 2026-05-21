<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let {
		count = 6,
		/** `own-chapter` mirrors manual-test chapter toolbar + selectable question cards */
		variant = 'default' as 'default' | 'own-chapter'
	}: { count?: number; variant?: 'default' | 'own-chapter' } = $props();

	const isOwnChapter = $derived(variant === 'own-chapter');
</script>

<div
	class="own-test-chapter-page {isOwnChapter ? 'flex flex-col gap-3 pb-24' : 'space-y-3 pb-24'}"
	aria-busy="true"
	aria-label="Loading questions"
>
	{#if isOwnChapter}
		<div class="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
			<div class="min-w-0 space-y-2">
				<Skeleton width="w-44" height="h-4" className="max-w-full" />
				<Skeleton width="w-56" height="h-3.5" className="max-w-full" />
			</div>
			<div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
				<Skeleton width="w-[4.75rem]" height="h-9" rounded="rounded-lg" />
				<Skeleton width="w-[11.5rem]" height="h-9" rounded="rounded-lg" />
			</div>
		</div>
	{:else}
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<Skeleton width="w-48" height="h-6" strong />
			<div class="flex gap-2">
				<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
				<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
			</div>
		</div>
	{/if}

	{#each Array(count) as _, i (i)}
		<div
			class="{isOwnChapter
				? 'rounded-2xl border border-[var(--own-question-border)] bg-[var(--own-question-bg)] p-4'
				: 'skel-card rounded-2xl p-4'}"
		>
			<div class="flex min-w-0 items-start gap-2">
				<Skeleton
					width="w-4"
					height="h-4"
					rounded="rounded"
					className="shrink-0 mt-0.5"
				/>
				<Skeleton width="w-5" height="h-4" rounded="rounded" className="shrink-0" strong />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton width="w-full" height="h-4" />
					{#if !isOwnChapter}
						<Skeleton width="w-11/12" height="h-4" />
						<Skeleton width="w-4/5" height="h-4" />
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>
