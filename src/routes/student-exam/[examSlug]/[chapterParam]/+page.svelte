<script lang="ts">
	import MathText from "$lib/components/MathText.svelte";
	import type { PageData } from "./+page.server";
	import { goto } from "$app/navigation";
	import { browser } from "$app/environment";
	import { questionStore } from "$lib/stores/question";
	import { navigating } from "$app/stores";

	type Question = PageData["questions"][number];
	type ImageLike = string | { url?: string; alt?: string; publicId?: string; version?: number };

	let { data } = $props<{ data: PageData }>();

	let selectedQuestionIndex = $state<number | null>(null);
	let reviewStartIndex = $state(0);
	let previewAllQuestions = $state<Question[]>([]);
	let previewBaseNumber = $state(0);
	let lastReviewDatasetKey = $state<string | null>(null);
	let sidebarCollapsed = $state(false);
	let filterDrawerOpen = $state(false);
	let draftDifficulties = $state<string[]>(['easy']);
	let draftKinds = $state<string[]>([]);

	const REVIEW_PAGE_SIZE = 5;
	const PAGINATION_WINDOW = 2;

	const difficultyOptions = ['easy', 'medium', 'hard'] as const;
	const kindOptions = ['MCQ', 'MSQ', 'TRUE_FALSE', 'INTEGER', 'FILL_BLANK', 'COMPREHENSION_PASSAGE'] as const;

	const filteredChapters = $derived(data.allChapters);
	const isLoading = $derived($navigating !== null);

	$effect(() => {
		if (browser && data.subjectSlug) {
			sessionStorage.setItem(`exam-${data.examSlug}-subject`, data.subjectSlug);
		}
	});

	$effect(() => {
		draftDifficulties = data.activeDifficulties;
		draftKinds = data.activeKinds;
	});

	$effect(() => {
		// If filters/page/chapter changes while review is open, re-seed review data so it reflects new filters.
		const d = [...data.activeDifficulties].sort().join(',');
		const k = data.activeKinds.length ? [...data.activeKinds].sort().join(',') : 'all';
		const key = `${data.resolvedChapterId ?? 'none'}::d=${d}::k=${k}::p=${data.safePage}`;

		if (selectedQuestionIndex === null) {
			lastReviewDatasetKey = key;
			return;
		}

		if (lastReviewDatasetKey === key) return;
		lastReviewDatasetKey = key;

		const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
		previewAllQuestions = pool;
		const limit = reviewPageLimit();
		const pageStart = (data.safePage - 1) * limit;

		previewBaseNumber = 1;
		reviewStartIndex = data.requestedReviewStart ?? pageStart;
		selectedQuestionIndex = 0;
	});

	$effect(() => {
		// Open preview mode from SSR query (preview=1&reviewStart=...)
		if (!data.previewMode) return;
		const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
		const carry = readCarry();
		previewAllQuestions =
			carry?.direction === 'prepend'
				? [...carry.questions, ...pool]
				: carry?.direction === 'append'
					? [...pool, ...carry.questions]
					: pool;
		previewBaseNumber = 1;
		const limit = reviewPageLimit();
		const pageStart = (data.safePage - 1) * limit;
		reviewStartIndex = data.requestedReviewStart ?? pageStart;
		selectedQuestionIndex = 0;
	});

	const storeChapterKey = $derived.by(() => {
		if (!data.resolvedChapterId) return null;
		const d = [...data.activeDifficulties].sort().join(',');
		const k = data.activeKinds.length ? [...data.activeKinds].sort().join(',') : 'all';
		return `${data.resolvedChapterId}::d=${d}::k=${k}`;
	});

	const hasCurrentPage = $derived.by(() => {
		if (!storeChapterKey) return false;
		$questionStore;
		return questionStore.hasPage(storeChapterKey, data.safePage);
	});

	const displayQuestions = $derived.by(() => {
		if (!storeChapterKey) return data.questions;
		$questionStore;
		return hasCurrentPage
			? questionStore.getQuestionsForPage(storeChapterKey, data.safePage) ?? []
			: data.questions;
	});

	const displayPaginationMeta = $derived.by(() => {
		if (!storeChapterKey) return data.paginationMeta;
		$questionStore;
		return hasCurrentPage
			? questionStore.getPagination(storeChapterKey) ?? data.paginationMeta
			: data.paginationMeta;
	});

	$effect(() => {
		if (!browser) return;
		if (!storeChapterKey) return;
		if (!data.questions.length) return;
		if (hasCurrentPage) return;

		questionStore.setQuestionsPage(storeChapterKey, data.safePage, data.questions, data.paginationMeta ?? undefined);
	});

	const chapterBaseUrl = (chapterParamOverride?: string) =>
		`/student-exam/${data.examSlug}/${encodeURIComponent(chapterParamOverride ?? data.chapterParam)}`;

	const activeFiltersQuery = (opts?: { page?: number }) => {
		const params = new URLSearchParams();
		params.set('difficulty', data.activeDifficulties.join(','));
		if (data.activeKinds.length) params.set('kind', data.activeKinds.join(','));
		params.set('page', String(opts?.page ?? 1));
		return params.toString();
	};

	const chapterHref = (
		chapterParamValue: string,
		opts?: { page?: number; preview?: boolean; reviewStart?: number; carry?: boolean }
	) => {
		const params = new URLSearchParams(activeFiltersQuery(opts));
		if (opts?.preview) params.set('preview', '1');
		if (typeof opts?.reviewStart === 'number') params.set('reviewStart', String(opts.reviewStart));
		if (opts?.carry) params.set('carry', '1');
		return `${chapterBaseUrl(chapterParamValue)}?${params.toString()}`;
	};

	const questionsPageUrl = (p: number) => `${chapterBaseUrl()}?${activeFiltersQuery({ page: p })}`;

	async function applyFilters() {
		const params = new URLSearchParams();
		params.set('difficulty', draftDifficulties.length ? draftDifficulties.join(',') : 'easy');
		if (draftKinds.length) params.set('kind', draftKinds.join(','));
		params.set('page', '1');
		const qs = params.toString();
		await goto(`${chapterBaseUrl()}?${qs}`);
		filterDrawerOpen = false;
	}

	async function clearKindFilter() {
		draftKinds = [];
		await applyFilters();
	}

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

	function reviewPageLimit(): number {
		return displayPaginationMeta?.limit ?? 25;
	}

	function reviewTotal(): number {
		return displayPaginationMeta?.total ?? 0;
	}

	function pageForGlobalIndex(globalIndex: number, limit: number): number {
		return Math.floor(globalIndex / limit) + 1;
	}

	function offsetForGlobalIndex(globalIndex: number, limit: number): number {
		return globalIndex % limit;
	}

	/** Global index of previewAllQuestions[0] (handles carry prepend/append vs plain API page). */
	const reviewPoolBaseGlobal = $derived.by((): number => {
		const limit = reviewPageLimit();
		const pageStart = (data.safePage - 1) * limit;
		const pool = previewAllQuestions;
		const api = displayQuestions as Question[];
		if (!pool.length || !api.length) return pageStart;
		if (pool.length === api.length) return pageStart;
		const mergedStartsWithApi =
			pool.length >= api.length &&
			pool.slice(0, api.length).every((q, i) => q._id === api[i]?._id);
		if (mergedStartsWithApi) return pageStart;
		return pageStart - (pool.length - api.length);
	});

	const reviewQuestions = $derived.by((): Question[] => {
		const base = reviewPoolBaseGlobal;
		const localStart = Math.max(0, reviewStartIndex - base);
		return previewAllQuestions.slice(localStart, localStart + REVIEW_PAGE_SIZE);
	});

	const canReviewPrev = $derived(reviewStartIndex > 0);
	const canReviewNext = $derived.by(() => {
		const total = reviewTotal();
		if (!total) return false;
		return reviewStartIndex + REVIEW_PAGE_SIZE < total;
	});
	const reviewPageNumber = $derived(Math.floor(reviewStartIndex / REVIEW_PAGE_SIZE) + 1);

	type CarryPayload = { direction: 'prepend' | 'append'; questions: Question[] };
	const carryStorageKey = () => {
		const d = [...data.activeDifficulties].sort().join(',');
		const k = data.activeKinds.length ? [...data.activeKinds].sort().join(',') : 'all';
		return `review-carry::${data.resolvedChapterId ?? 'none'}::d=${d}::k=${k}`;
	};

	function writeCarry(payload: CarryPayload) {
		if (!browser) return;
		try {
			sessionStorage.setItem(carryStorageKey(), JSON.stringify(payload));
		} catch {}
	}

	function readCarry(): CarryPayload | null {
		if (!browser) return null;
		try {
			const raw = sessionStorage.getItem(carryStorageKey());
			if (!raw) return null;
			sessionStorage.removeItem(carryStorageKey());
			const parsed = JSON.parse(raw) as CarryPayload;
			if (!parsed || !Array.isArray(parsed.questions)) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	async function openQuestionPreview(index: number) {
		selectedQuestionIndex = index;

		const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
		previewAllQuestions = pool;

		const limit = reviewPageLimit();
		previewBaseNumber = 1;
		const pageStart = (data.safePage - 1) * limit;
		const globalIndex = pageStart + index;
		// First card in practice = the question you clicked (not a earlier 5-pack).
		reviewStartIndex = globalIndex;

		const lastPage = displayPaginationMeta?.lastPage ?? data.paginationMeta?.lastPage ?? 1;
		const targetApiPage = pageForGlobalIndex(globalIndex, limit);
		if (browser && targetApiPage !== data.safePage && targetApiPage >= 1 && targetApiPage <= lastPage) {
			await goto(
				chapterHref(data.chapterParam, {
					page: targetApiPage,
					preview: true,
					reviewStart: globalIndex,
					carry: false
				})
			);
			return;
		}

		// Fewer than 5 questions left on this API page (e.g. clicked Q25 on a 25-row page) — load next page with carry so practice still shows 5 cards (Q25–Q29).
		const remainingOnPage = pool.length - index;
		if (browser && remainingOnPage < REVIEW_PAGE_SIZE && remainingOnPage > 0 && data.safePage < lastPage) {
			writeCarry({ direction: 'prepend', questions: pool.slice(index) });
			await goto(
				chapterHref(data.chapterParam, {
					page: data.safePage + 1,
					preview: true,
					reviewStart: globalIndex,
					carry: true
				})
			);
		}
	}

	async function goReviewPrev() {
		if (!canReviewPrev) return;
		const next = Math.max(0, reviewStartIndex - REVIEW_PAGE_SIZE);
		const limit = reviewPageLimit();
		const targetPage = pageForGlobalIndex(next, limit);
		if (targetPage !== data.safePage) {
			// When moving backward across pages, append the first few questions from current page
			// so previous page can render a full set of 5 if needed.
			const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
			writeCarry({ direction: 'append', questions: pool.slice(0, REVIEW_PAGE_SIZE) });
			await goto(chapterHref(data.chapterParam, { page: targetPage, preview: true, reviewStart: next, carry: true }));
			return;
		}
		reviewStartIndex = next;
	}

	async function goReviewNext() {
		if (!canReviewNext) return;
		const next = reviewStartIndex + REVIEW_PAGE_SIZE;
		const limit = reviewPageLimit();
		const pageStart = (data.safePage - 1) * limit;
		const pool = (data.reviewPoolQuestions?.length ? data.reviewPoolQuestions : displayQuestions) as Question[];
		const lastPage = displayPaginationMeta?.lastPage ?? data.paginationMeta?.lastPage ?? 1;
		const targetPage = pageForGlobalIndex(next, limit);

		if (targetPage !== data.safePage) {
			const localStart = Math.max(0, next - pageStart);
			writeCarry({ direction: 'prepend', questions: pool.slice(localStart) });
			await goto(chapterHref(data.chapterParam, { page: targetPage, preview: true, reviewStart: next, carry: true }));
			return;
		}

		// Same API page: next 5 would extend past this page's pool — fetch following API page with carry (fixes Q25-only then skip to Q30).
		const localNext = next - pageStart;
		if (localNext + REVIEW_PAGE_SIZE > pool.length && data.safePage < lastPage) {
			writeCarry({ direction: 'prepend', questions: pool.slice(localNext) });
			await goto(chapterHref(data.chapterParam, { page: data.safePage + 1, preview: true, reviewStart: next, carry: true }));
			return;
		}

		reviewStartIndex = next;
	}

	function closeQuestionPreview() {
		selectedQuestionIndex = null;
		reviewStartIndex = 0;
		previewAllQuestions = [];
		previewBaseNumber = 0;
	}

	function imageSrc(image: ImageLike): string {
		if (typeof image === "string") return image;
		return image?.url ?? "";
	}

	function imageAlt(image: ImageLike): string {
		if (typeof image === "string") return "";
		return image?.alt ?? "";
	}

	function imageKey(image: ImageLike): string {
		// Prefer computed URL if present; otherwise fall back to stable Cloudinary fields.
		if (typeof image === "string") return image;
		const url = image?.url;
		if (url) return url;
		const publicId = image?.publicId;
		const version = image?.version;
		if (publicId) return `${publicId}::${version ?? ""}`;
		return "";
	}

	function promptImagesOnly(q: Question): ImageLike[] {
		const promptImages = (q as any)?.prompt?.en?.images ?? [];
		if (!Array.isArray(promptImages) || promptImages.length === 0) return [];

		// De-dupe using imageKey instead of only `url`, so it also works when `url` is missing.
		const optionKeys = new Set(
			((q as any)?.prompt?.en?.options ?? [])
				.flatMap((opt: any) => (Array.isArray(opt?.images) ? opt.images : []))
				.map((img: any) => imageKey(img as ImageLike))
				.filter(Boolean),
		);

		if (optionKeys.size === 0) return promptImages as ImageLike[];

		return (promptImages as any[]).filter((img) => {
			const k = imageKey(img as ImageLike);
			if (!k) return true; // if we can't identify it, keep it
			return !optionKeys.has(k);
		});
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
			<aside class="flex h-full w-64 shrink-0 flex-col border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)]">
				<div class="flex-1 overflow-y-auto p-4">
					<button
						type="button"
						onclick={() => goto(`/student-exam/${data.examSlug}`)}
						class="mb-4 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--sb-collapse-text)] transition hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
							<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						Back to Subjects
					</button>
					<div class="mb-3 mt-2 flex items-center justify-between">
						<h2 class="text-xs font-semibold uppercase tracking-wider text-[var(--sb-nav-text)] opacity-70">Chapters</h2>
					</div>
					<nav class="space-y-1.5">
						{#each filteredChapters as ch (ch._id)}
							<a
								href={chapterHref(String(ch.slug ?? ch._id), { page: 1 })}
								class="block truncate rounded-lg px-3 py-2 text-sm transition font-[var(--sb-font-nav)] {ch._id === data.resolvedChapterId
									? 'bg-[var(--sb-nav-active-bg)] text-[var(--sb-nav-active-text)] shadow-[var(--sb-nav-active-glow)]'
									: 'text-[var(--sb-nav-text)] hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-text)]'}"
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
				class="fixed left-4 top-4 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-icon)] shadow-sm transition hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-icon)]"
				title="Expand sidebar"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
					<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>
		{/if}

		<main class="flex flex-1 flex-col overflow-hidden min-h-0">
			<div class="mx-auto flex h-full w-full max-w-6xl flex-col px-4 md:px-6 overflow-hidden min-h-0">
				{#if selectedQuestionIndex !== null}
					<div class="py-6 shrink-0">
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
					<div class="py-6 shrink-0">
						<div class="flex items-start justify-between gap-3">
							<div>
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
							<button
								type="button"
								class="rounded-lg border border-[var(--page-card-border)] px-3 py-1.5 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
								onclick={() => (filterDrawerOpen = true)}
							>
								Filters
							</button>
						</div>
						{#if displayPaginationMeta}
							<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--page-text-muted)]">
								<span class="rounded bg-[var(--page-card-bg)] px-2 py-1">Difficulty: {data.activeDifficulties.join(', ')}</span>
								<span class="rounded bg-[var(--page-card-bg)] px-2 py-1">Type: {data.activeKinds.length ? data.activeKinds.join(', ') : 'ALL'}</span>
							</div>
						{/if}
					</div>

					{#if displayQuestions.length === 0}
						<div class="flex flex-1 items-center justify-center">
							<div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]">
								No questions found.
							</div>
						</div>
					{:else if selectedQuestionIndex === null}
						{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
							<div class="shrink-0 border-b border-[var(--page-card-border)] pb-4">
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
											class="question-card group rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-tool-card-bg)] px-5 py-4 text-left shadow-[var(--shadow-item)] transition hover:-translate-y-1 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)]"
											onclick={() => openQuestionPreview(index)}
										>
											<div class="flex items-baseline gap-3">
												<div class="shrink-0 text-xs font-medium text-[var(--page-text-muted)] opacity-70 mt-1">
													Q{(data.safePage - 1) * (displayPaginationMeta?.limit ?? 10) + index + 1}
												</div>
												<div class="flex-1 text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
													<MathText content={q.prompt.en.content} />
													{#if promptImagesOnly(q).length}
														<div class="mt-3 flex flex-wrap gap-2.5">
															{#each promptImagesOnly(q) as img, imgIdx (`main-${q._id}-${imgIdx}`)}
																{@const src = imageSrc(img as ImageLike)}
																{#if src}
																	<img
																		src={src}
																		alt={imageAlt(img as ImageLike)}
																		class="max-h-40 max-w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																		loading="lazy"
																	/>
																{/if}
															{/each}
														</div>
													{/if}
												</div>
											</div>
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
							<div class="border-t border-[var(--page-card-border)] py-6 shrink-0">
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
							<div class="p-2 md:p-4">
								<div class="mb-6 flex items-center justify-between gap-3 sticky top-0 z-10 bg-[var(--page-bg)] py-2">
									<div class="text-sm font-bold text-[var(--page-text)]">
										Practice (5 per page)
									</div>
									<div class="flex items-center gap-2">
										<button
											type="button"
											class="rounded-full border border-[var(--sh-exam-card-border)] px-4 py-1.5 text-xs text-[var(--page-text-muted)] hover:bg-[var(--sh-exam-card-hover-border)]/20 disabled:opacity-50"
											disabled={!canReviewPrev}
											onclick={goReviewPrev}
										>
											Prev
										</button>
										<div class="text-xs font-medium text-[var(--page-text-muted)] px-1">
											Page {reviewPageNumber}
										</div>
										<button
											type="button"
											class="rounded-full border border-[var(--sh-exam-card-border)] px-4 py-1.5 text-xs text-[var(--page-text-muted)] hover:bg-[var(--sh-exam-card-hover-border)]/20 disabled:opacity-50"
											disabled={!canReviewNext}
											onclick={goReviewNext}
										>
											Next
										</button>
									</div>
								</div>

								<div class="flex flex-col gap-4">
									{#each reviewQuestions as q, i (q._id)}
										<div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-sm">
											<div class="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--page-text-muted)] opacity-70">
												Q{previewBaseNumber + reviewStartIndex + i}
											</div>
											<div class="text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
												<MathText content={q.prompt.en.content} />
												{#if promptImagesOnly(q).length}
													<div class="mt-3 flex flex-wrap gap-2.5">
														{#each promptImagesOnly(q) as img, imgIdx (`preview-${q._id}-${imgIdx}`)}
															{@const src = imageSrc(img as ImageLike)}
															{#if src}
																<img
																	src={src}
																	alt={imageAlt(img as ImageLike)}
																	class="max-h-56 max-w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																	loading="lazy"
																/>
															{/if}
														{/each}
													</div>
												{/if}
											</div>

											{#if q.prompt.en.options?.length}
												<div class="mt-5 grid gap-2.5">
													{#each q.prompt.en.options as option (option.identifier)}
														<div class="flex items-start gap-4 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--page-bg)]/40 px-4 py-4 transition hover:bg-[var(--page-bg)]/60">
															<span class="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]">
																{option.identifier}
															</span>
															<div class="min-w-0 flex-1 break-words">
																<MathText content={option.content} />
																{#if option.images?.length}
																	<div class="mt-2 flex flex-wrap gap-2">
																		{#each option.images as img, imgIdx (`opt-${q._id}-${option.identifier}-${imgIdx}`)}
																			{@const src = imageSrc(img as ImageLike)}
																			{#if src}
																				<img
																					src={src}
																					alt={imageAlt(img as ImageLike)}
																					class="max-h-32 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-bg)] object-contain"
																					loading="lazy"
																				/>
																			{/if}
																		{/each}
																	</div>
																{/if}
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

{#if filterDrawerOpen}
	<div
		class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity"
		role="button"
		tabindex="0"
		onclick={() => (filterDrawerOpen = false)}
		onkeydown={(e) => (e.key === 'Escape' ? (filterDrawerOpen = false) : null)}
	></div>
	<aside class="fixed left-0 top-0 z-40 h-full w-[300px] border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)] p-6 shadow-2xl">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-base font-semibold text-[var(--page-text)]">Filters</h3>
			<button
				type="button"
				class="rounded px-2 py-1 text-sm text-[var(--page-text-muted)] hover:bg-[var(--page-bg)]"
				onclick={() => (filterDrawerOpen = false)}
			>
				Close
			</button>
		</div>

		<div class="space-y-5">
			<div>
				<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Difficulty</div>
				<div class="flex flex-wrap gap-2.5">
					{#each difficultyOptions as option}
						<button
							type="button"
							onclick={() => {
								const next = draftDifficulties.includes(option)
									? draftDifficulties.filter((d) => d !== option)
									: [...draftDifficulties, option];
								draftDifficulties = next.length ? next : ['easy'];
							}}
							class="rounded-lg border px-3 py-1.5 text-xs font-medium transition {draftDifficulties.includes(option)
								? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)] shadow-[0_0_10px_rgba(79,126,255,0.15)]'
								: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Type</div>
				<div class="grid gap-2.5">
					{#each kindOptions as option}
						<button
							type="button"
							onclick={() => {
								draftKinds = draftKinds.includes(option)
									? draftKinds.filter((k) => k !== option)
									: [...draftKinds, option];
							}}
							class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {draftKinds.includes(option)
								? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)] shadow-[0_0_10px_rgba(79,126,255,0.15)]'
								: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
						>
							{option}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex items-center gap-3 pt-4 border-t border-[var(--sb-border-color)]">
				<button
					type="button"
					class="flex-1 rounded-xl border border-[var(--sb-border-color)] px-3 py-2 text-sm font-medium text-[var(--sb-nav-text)] hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)] transition"
					onclick={clearKindFilter}
				>
					Clear type
				</button>
				<button
					type="button"
					class="flex-1 rounded-xl border border-[var(--page-link)] bg-[var(--page-link)] px-3 py-2 text-sm font-medium text-white shadow-[var(--shadow-item)] hover:shadow-[var(--shadow-item-hover)] hover:-translate-y-0.5 transition"
					onclick={applyFilters}
				>
					Apply
				</button>
			</div>
		</div>
	</aside>
{/if}
