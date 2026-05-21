<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { count = 5 }: { count?: number } = $props();
</script>

<!--
  Matches `exams/[examSlug]/[chapterParam]/+page.svelte` list layout only
  (header → scrollable question cards → bottom pagination strip).
-->
<div
	class="student-exam-question-page relative flex h-full min-h-0 w-full overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)] max-sm:min-h-[calc(100dvh-72px)]"
	aria-busy="true"
	aria-label="Loading questions"
>
	<div class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden">
		<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div
				class="mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden px-2 sm:px-4 md:px-6"
			>
				<div class="shrink-0 px-2 py-2.5">
					<div
						class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
					>
						<div class="-ml-1 flex flex-col gap-1.5 text-sm text-[var(--page-text-muted)]">
							<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
							<Skeleton width="w-12" height="h-3.5" className="hidden sm:block" />
						</div>

						<div
							class="flex w-full shrink-0 flex-nowrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-4"
						>
							<Skeleton
								width="w-10"
								height="h-3.5"
								rounded="rounded"
								className="shrink-0 sm:hidden"
								strong
							/>

							<div
								class="flex shrink-0 items-center justify-center gap-0.5 sm:hidden"
								aria-hidden="true"
							>
								<Skeleton width="w-7" height="h-7" rounded="rounded-md" className="shrink-0" />
								<Skeleton
									width="w-[26px]"
									height="h-[26px]"
									rounded="rounded-full"
									className="shrink-0"
									strong
								/>
								<Skeleton
									width="w-6"
									height="h-6"
									rounded="rounded-full"
									className="shrink-0"
								/>
								<Skeleton
									width="w-6"
									height="h-6"
									rounded="rounded-full"
									className="shrink-0"
								/>
								<Skeleton width="w-7" height="h-7" rounded="rounded-md" className="shrink-0" />
							</div>

							<div
								class="hidden items-center rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-1 shadow-sm sm:flex"
								aria-hidden="true"
							>
								<Skeleton width="w-14" height="h-7" rounded="rounded-md" className="shrink-0" />
								<Skeleton width="w-[4.75rem]" height="h-7" rounded="rounded-md" className="mx-0.5 shrink-0" />
								<Skeleton width="w-[5.25rem]" height="h-7" rounded="rounded-md" className="shrink-0" />
							</div>

							<div
								class="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[var(--sh-ai-sub)]"
								aria-hidden="true"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									class="shrink-0 opacity-80"
								>
									<path
										d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<Skeleton width="w-24" height="h-4" className="hidden sm:block" />
							</div>
						</div>
					</div>
				</div>

				<div class="min-h-0 flex-1 overflow-y-auto py-3">
					<div class="flex flex-col gap-4">
						{#each Array(count) as _, i (i)}
							<div
								class="question-card rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-tool-card-bg)] px-4 py-3.5 text-left shadow-sm"
							>
								<div class="flex items-baseline gap-2">
									<Skeleton
										width="w-6"
										height="h-4"
										rounded="rounded"
										className="shrink-0 sm:w-7"
										strong
									/>
									<div class="min-w-0 flex-1 space-y-2">
										<Skeleton width="w-full" height="h-4" />
										<Skeleton width="w-[92%]" height="h-4" className="hidden sm:block" />
										<Skeleton width="w-3/4" height="h-4" className="hidden md:block" />
									</div>
								</div>
								<div class="mt-1.5 pl-0.5">
									<div
										class="inline-flex rounded border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 px-2 py-0.5"
									>
										<Skeleton width="w-24" height="h-3" rounded="rounded" className="opacity-90" />
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div
					class="shrink-0 border-t border-[var(--page-card-border)] py-3"
					aria-hidden="true"
				>
					<div class="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
						<Skeleton width="w-7" height="h-8" rounded="rounded-md" className="max-sm:h-7" />
						<Skeleton width="w-6" height="h-6" rounded="rounded-full" className="max-sm:h-[26px] max-sm:w-[26px]" />
						<Skeleton width="w-6" height="h-6" rounded="rounded-full" className="max-sm:h-6 max-sm:w-6" strong />
						<Skeleton width="w-6" height="h-6" rounded="rounded-full" className="max-sm:h-6 max-sm:w-6" />
						<Skeleton width="w-6" height="h-6" rounded="rounded-full" className="max-sm:h-6 max-sm:w-6" />
						<Skeleton width="w-7" height="h-8" rounded="rounded-md" className="max-sm:h-7" />
					</div>
				</div>
			</div>
		</main>
	</div>
</div>
