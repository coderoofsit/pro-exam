<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { yearRows = 6, expandedPaperRows = 2 }: { yearRows?: number; expandedPaperRows?: number } = $props();
</script>

<!-- Mirrors `PYQAccordion.svelte` + `pyq-papers-page` wrapper from student/tests/pyq/[examSlug]/+page.svelte -->
<div
	class="pyq-papers-page min-h-full bg-[var(--pyq-page-bg)] font-sans"
	aria-busy="true"
	aria-label="Loading PYQ papers"
>
	<div class="mx-auto max-w-6xl px-4 py-4">
		<!-- Toolbar -->
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-wrap items-center gap-3">
				<Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
				<Skeleton width="w-52" height="h-4" className="max-w-[min(100%,20rem)]" />
			</div>
			<div class="flex items-center gap-2">
				<div
					class="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-3"
				>
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						class="shrink-0 text-[var(--pyq-sort-btn-icon)] opacity-70"
						aria-hidden="true"
					>
						<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" />
						<path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
					</svg>
					<Skeleton width="w-16" height="h-3" />
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						class="shrink-0 text-[var(--pyq-sort-btn-icon)] opacity-70"
						aria-hidden="true"
					>
						<path
							d="M6 9l6 6 6-6"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<div
					class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-3"
				>
					<span
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)]"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-[var(--pyq-sort-btn-icon)] opacity-70" aria-hidden="true">
							<path
								d="M7 3v18M7 21l-3-3M7 21l3-3M17 21V3M17 3l-3 3M17 3l3 3"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					<Skeleton width="w-10" height="h-3" />
					<Skeleton width="w-3" height="h-3" rounded="rounded" />
				</div>
			</div>
		</div>

		<!-- Accordion list -->
		<div class="flex flex-col gap-2">
			{#each Array(yearRows) as _, y (y)}
				<div
					class="rounded-xl border overflow-hidden {y === 0
						? 'bg-[var(--pyq-accordion-open-bg)] border-[var(--pyq-accordion-open-border)]'
						: 'bg-[var(--pyq-accordion-bg)] border-[var(--pyq-accordion-border)]'}"
				>
					<div class="flex w-full items-center justify-between px-4 py-3 text-left">
						<Skeleton width="w-full" height="h-4" strong className={y === 0 ? 'max-w-md' : 'max-w-sm'} />
						<span
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--pyq-accordion-border)] bg-[var(--pyq-accordion-hover-bg)] {y === 0
								? 'rotate-180 border-[var(--pyq-accordion-open-border)] bg-[var(--pyq-accordion-open-bg)]'
								: ''}"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-[var(--pyq-accordion-chevron-active)] opacity-80" aria-hidden="true">
								<path
									d="M6 9l6 6 6-6"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</div>

					{#if y === 0}
						<div class="px-2.5 pb-2.5">
							<div class="mb-1.5 border-t border-[var(--pyq-accordion-divider)]"></div>
							<div class="flex flex-col gap-1.5">
								{#each Array(expandedPaperRows) as _, p (p)}
									<div
										class="flex flex-col gap-2 overflow-hidden rounded-xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
									>
										<div class="min-w-0 flex-1 px-3 py-2 sm:pl-3.5">
											<div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
												<Skeleton width="w-56" height="h-4" strong />
												<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
													<Skeleton width="w-24" height="h-3" />
													<Skeleton width="w-16" height="h-5" rounded="rounded-md" />
												</div>
											</div>
										</div>
										<div
											class="flex w-full shrink-0 items-center justify-center px-2 py-2 sm:w-auto sm:justify-end sm:px-2 sm:py-2 sm:pl-0"
										>
											<Skeleton width="w-full" height="h-8" rounded="rounded-xl" className="sm:w-[7.25rem] sm:max-w-[8rem]" />
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
