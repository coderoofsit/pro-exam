<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { optionCount = 4 }: { optionCount?: number } = $props();
</script>

<!-- Card interior only — back button lives in +page header (see student-exam-question-page) -->
<div
	class="exam-question-detail-skeleton flex h-full min-h-0 flex-col overflow-hidden"
	aria-busy="true"
	aria-label="Loading question"
>
	<div class="min-h-0 flex-1 overflow-hidden">
		<div class="flex h-full min-h-0 flex-col">
			<!-- Action chips: approve · edit · report -->
			<div class="mb-3 flex flex-wrap items-center gap-2">
				<Skeleton width="w-[4.5rem]" height="h-6" rounded="rounded-md" />
				<Skeleton width="w-[5.25rem]" height="h-6" rounded="rounded-lg" />
				<Skeleton width="w-12" height="h-6" rounded="rounded-lg" className="max-sm:order-3 sm:ml-auto" />
				<Skeleton width="w-14" height="h-6" rounded="rounded-lg" />
			</div>

			<!-- Question number + prompt lines -->
			<div class="mb-3 flex items-baseline gap-2">
				<Skeleton width="w-5" height="h-4" className="shrink-0" />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton width="w-full" height="h-4" />
					<Skeleton width="w-[92%]" height="h-4" />
					<Skeleton width="w-[78%]" height="h-4" className="hidden sm:block" />
				</div>
			</div>

			<!-- Paper id chip -->
			<Skeleton width="w-28" height="h-7" rounded="rounded-md" className="mb-4" />

			<!-- MCQ options — single column on mobile (matches grid-cols-1 md:grid-cols-2) -->
			<div class="mb-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-2.5">
				{#each Array(optionCount) as _, i (i)}
					<div
						class="flex items-center gap-3 rounded-xl border border-[var(--skel-border)] bg-[var(--skel-surface)] p-3 max-sm:gap-3 max-sm:p-3.5 sm:gap-4 sm:p-4"
					>
						<Skeleton
							width="w-8"
							height="h-8"
							rounded="rounded-full"
							className="shrink-0"
						/>
						<div class="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
							<Skeleton width="w-full" height="h-3.5 sm:h-4" />
							<Skeleton width="w-[70%]" height="h-3.5 sm:h-4" className="max-sm:hidden" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Footer: Previous · Check Answer · Next -->
	<div
		class="exam-question-detail-skeleton__footer shrink-0 border-t border-[var(--skel-border)] pt-3 max-sm:mt-1"
	>
		<div
			class="flex items-center justify-between gap-2 max-sm:flex-nowrap sm:flex-wrap sm:gap-3 md:flex-nowrap"
		>
			<Skeleton
				width="w-full"
				height="h-10"
				rounded="rounded-lg"
				className="max-sm:min-w-[72px] max-sm:flex-1 sm:min-w-[100px] sm:flex-none sm:w-[100px]"
			/>
			<Skeleton
				width="w-full"
				height="h-10"
				rounded="rounded-lg"
				className="max-sm:min-w-[100px] max-sm:flex-[1.5] sm:min-w-[180px] sm:flex-none sm:w-[180px]"
			/>
			<Skeleton
				width="w-full"
				height="h-10"
				rounded="rounded-lg"
				className="max-sm:min-w-[72px] max-sm:flex-1 sm:min-w-[100px] sm:flex-none sm:w-[100px]"
			/>
		</div>
	</div>
</div>

<style>
	@media (max-width: 639px) {
		.exam-question-detail-skeleton {
			min-height: min(100%, calc(100dvh - 8.5rem));
		}

		.exam-question-detail-skeleton__footer {
			padding-bottom: max(0.25rem, env(safe-area-inset-bottom, 0px));
		}
	}
</style>
