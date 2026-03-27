<script lang="ts">
	import MathText from "$lib/components/MathText.svelte";
	import type { PageData } from "./+page.server";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { questionStore } from "$lib/stores/question";
	import { navigating } from "$app/stores";

	type Question = PageData["questions"][number];

	let { data } = $props<{ data: PageData }>();

	let selectedQuestionIndex = $state<number | null>(null);
	let reviewPage = $state(1);
	let previewAllQuestions = $state<Question[]>([]);
	let previewBaseNumber = $state(0);
	let sidebarCollapsed = $state(false);

	const REVIEW_PAGE_SIZE = 5;
	const PAGINATION_WINDOW = 2;

	const filteredChapters = $derived(data.allChapters);
	const isLoading = $derived($navigating !== null);

	$effect(() => {
		if (browser && data.subjectSlug) {
			sessionStorage.setItem(`exam-${data.examSlug}-subject`, data.subjectSlug);
		}
	});

	const hasCurrentPage = $derived.by(() => {
		if (!data.resolvedChapterId) return false;
		$questionStore;
		return questionStore.hasPage(data.resolvedChapterId, data.safePage);
	});

	const displayQuestions = $derived.by(() => {
		if (!data.resolvedChapterId) return data.questions;
		$questionStore;
		return hasCurrentPage
			? questionStore.getQuestionsForPage(data.resolvedChapterId, data.safePage) ?? []
			: data.questions;
	});

	const displayPaginationMeta = $derived.by(() => {
		if (!data.resolvedChapterId) return data.paginationMeta;
		$questionStore;
		return hasCurrentPage
			? questionStore.getPagination(data.resolvedChapterId) ?? data.paginationMeta
			: data.paginationMeta;
	});

	$effect(() => {
		if (!browser) return;
		if (!data.resolvedChapterId) return;
		if (!data.questions.length) return;
		if (hasCurrentPage) return;

		questionStore.setQuestionsPage(data.resolvedChapterId, data.safePage, data.questions, data.paginationMeta ?? undefined);
	});

	const questionsPageUrl = (p: number) =>
		p <= 1
			? `/student-exam/${data.examSlug}/${encodeURIComponent(data.chapterParam)}`
			: `/student-exam/${data.examSlug}/${encodeURIComponent(data.chapterParam)}?page=${p}`;

	const paginationStartPage = $derived(
		displayPaginationMeta
			? Math.max(1, data.safePage - PAGINATION_WINDOW)
			: 1,
	);

	const paginationEndPage = $derived(
		displayPaginationMeta
			? Math.min(
					displayPaginationMeta.lastPage,
					data.safePage + PAGINATION_WINDOW,
				)
			: 1,
	);

	const visiblePageNumbers = $derived(
		Array.from(
			{
				length: Math.max(
					0,
					paginationEndPage - paginationStartPage + 1,
				),
			},
			(_, i) => paginationStartPage + i,
		),
	);

	const reviewQuestions = $derived.by((): Question[] => {
		const start = (reviewPage - 1) * REVIEW_PAGE_SIZE;
		return previewAllQuestions.slice(start, start + REVIEW_PAGE_SIZE);
	});

	const canReviewPrev = $derived(reviewPage > 1);
	const canReviewNext = $derived.by(() => {
		return reviewPage * REVIEW_PAGE_SIZE < previewAllQuestions.length;
	});

	async function openQuestionPreview(index: number) {
		selectedQuestionIndex = index;

		const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
		previewAllQuestions = pool;

		const limit = displayPaginationMeta?.limit ?? 10;
		previewBaseNumber = 1;
		// Open review on the page that contains the clicked question in the full pooled sequence.
		const globalIndex = (data.safePage - 1) * limit + index;
		reviewPage = Math.floor(globalIndex / REVIEW_PAGE_SIZE) + 1;
	}

	async function goReviewPrev() {
		if (reviewPage <= 1) return;
		reviewPage = reviewPage - 1;
	}

	async function goReviewNext() {
		if (!canReviewNext) return;
		const next = reviewPage + 1;
		reviewPage = next;
	}

	function closeQuestionPreview() {
		selectedQuestionIndex = null;
		reviewPage = 1;
		previewAllQuestions = [];
		previewBaseNumber = 0;
	}
</script>

<svelte:head>
	<title>Questions</title>
	<style>
		body {
			overflow: hidden;
		}
	</style>
</svelte:head>

<div class="flex h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]">
	<div class="mx-auto flex h-full w-full max-w-7xl overflow-hidden">
		{#if selectedQuestionIndex === null && !sidebarCollapsed}
			<aside class="flex h-full w-64 shrink-0 flex-col border-r border-[var(--page-card-border)] bg-[var(--page-card-bg)]">
				<div class="flex-1 overflow-y-auto p-4">
					<button
						type="button"
						onclick={() => goto(`/student-exam/${data.examSlug}`)}
						class="mb-4 flex items-center gap-2 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
							<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						Back
					</button>
					<div class="mb-3 flex items-center justify-between">
						<h2 class="text-sm font-semibold uppercase tracking-wider text-[var(--page-text-muted)]">Chapters</h2>
					</div>
					<nav class="space-y-1">
						{#each filteredChapters as ch (ch._id)}
							<a
								href={`/student-exam/${data.examSlug}/${encodeURIComponent(ch.slug ?? ch._id)}`}
								class="block truncate rounded px-2 py-1.5 text-sm transition {ch._id === data.resolvedChapterId
									? 'border border-[var(--page-link)]/40 bg-[var(--page-link)]/10 font-medium text-[var(--page-link)]'
									: 'text-[var(--page-text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]'}"
							>
								{ch.order}. {ch.name?.en ?? ch.slug}
							</a>
						{/each}
					</nav>
				</div>
			</aside>
		{/if}

		{#if selectedQuestionIndex === null && sidebarCollapsed}
			<button
				type="button"
				onclick={() => sidebarCollapsed = false}
				class="fixed left-4 top-4 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] text-[var(--page-text-muted)] shadow-sm transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
				title="Expand sidebar"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
					<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		{/if}

		<main class="flex flex-1 flex-col">
			<div class="mx-auto flex h-full w-full max-w-4xl flex-col px-6">
				{#if selectedQuestionIndex !== null}
					<div class="py-6">
						<button
							type="button"
							onclick={closeQuestionPreview}
							class="inline-block text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
						>
							← Back
						</button>
					</div>
				{/if}

				{#if data.message}
					<div class="flex flex-1 items-center justify-center text-semantic-error">
						{data.message}
					</div>
				{:else}
					<div class="py-6">
						<h1 class="text-2xl font-bold md:text-3xl">
							{data.chapter?.name?.en ?? data.chapterParam}
						</h1>
						{#if displayPaginationMeta}
							<p class="mt-2 text-sm text-[var(--page-text-muted)]">
								{displayPaginationMeta.total} questions • Page {data.safePage}
								of {displayPaginationMeta.lastPage}
							</p>
						{/if}
					</div>

					{#if displayQuestions.length === 0}
						<div class="flex flex-1 items-center justify-center">
							<div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]">
								No questions found.
							</div>
						</div>
					{:else if selectedQuestionIndex === null}
						<div class="flex-1 overflow-y-auto pb-6">
							{#if isLoading}
								<div class="flex flex-col gap-3">
									{#each Array(10) as _, i}
										<div class="animate-pulse rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3.5">
											<div class="flex items-baseline gap-3">
												<div class="h-4 w-8 shrink-0 rounded bg-[var(--page-bg)]"></div>
												<div class="flex-1 space-y-2">
													<div class="h-4 w-full rounded bg-[var(--page-bg)]"></div>
													<div class="h-4 w-3/4 rounded bg-[var(--page-bg)]"></div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col gap-3">
									{#each displayQuestions as q, index (q._id)}
										<button
											type="button"
											class="rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3.5 text-left"
											onclick={() => openQuestionPreview(index)}
										>
											<div class="flex items-baseline gap-3">
												<div class="shrink-0 text-xs font-medium text-[var(--page-text-muted)]">
													Q{(data.safePage - 1) * (displayPaginationMeta?.limit ?? 10) + index + 1}
												</div>
												<div class="flex-1 text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
													<MathText content={q.prompt.en.content} />
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
							<div class="border-t border-[var(--page-card-border)] py-6">
								<div class="flex flex-wrap items-center justify-center gap-1.5">
									{#if data.safePage > 1}
										<a class="pagination-btn" href={questionsPageUrl(1)}>← First</a>
										<a class="pagination-btn" href={questionsPageUrl(data.safePage - 1)}>Prev</a>
									{/if}

									{#each visiblePageNumbers as pageNumber}
										<a
											class="pagination-btn px-3.5 {pageNumber === data.safePage ? 'page-link-active' : ''}"
											href={questionsPageUrl(pageNumber)}
										>
											{pageNumber}
										</a>
									{/each}

									{#if data.safePage < displayPaginationMeta.lastPage}
										<a class="pagination-btn" href={questionsPageUrl(data.safePage + 1)}>Next</a>
										<a class="pagination-btn" href={questionsPageUrl(displayPaginationMeta.lastPage)}>Last →</a>
									{/if}
								</div>
							</div>
						{/if}
					{:else}
						<div class="flex-1 overflow-y-auto pb-6">
							<div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-4">
								<div class="-mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3 sticky top-0 z-10">
									<div class="text-sm font-semibold text-[var(--page-text)]">
										Practice (5 per page)
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											class="rounded-lg border border-[var(--page-card-border)] px-3 py-1 text-sm text-[var(--page-text-muted)] hover:bg-[var(--page-bg)] disabled:opacity-50"
											disabled={!canReviewPrev}
											onclick={goReviewPrev}
										>
											Prev
										</button>
										<div class="text-xs text-[var(--page-text-muted)]">
											Page {reviewPage}
										</div>
										<button
											type="button"
											class="rounded-lg border border-[var(--page-card-border)] px-3 py-1 text-sm text-[var(--page-text-muted)] hover:bg-[var(--page-bg)] disabled:opacity-50"
											disabled={!canReviewNext}
											onclick={goReviewNext}
										>
											Next
										</button>
									</div>
								</div>

								<div class="flex flex-col gap-4">
									{#each reviewQuestions as q, i (q._id)}
										<div class="rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4">
											<div class="mb-2 text-xs font-medium text-[var(--page-text-muted)]">
												Q{previewBaseNumber + (reviewPage - 1) * REVIEW_PAGE_SIZE + i}
											</div>

											<div class="text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
												<MathText content={q.prompt.en.content} />
											</div>

											{#if q.prompt.en.options?.length}
												<div class="mt-4 grid gap-2.5">
													{#each q.prompt.en.options as option (option.identifier)}
														<div class="flex items-start gap-3.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3.5">
															<span class="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]">
																{option.identifier}
															</span>
															<div class="flex-1 overflow-x-auto">
																<MathText content={option.content} />
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</main>
	</div>
</div>
