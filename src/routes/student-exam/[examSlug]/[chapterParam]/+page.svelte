<script lang="ts">
	import MathText from "$lib/components/MathText.svelte";
	import { questionPromptEnContent, fetchQuestionById } from "$lib/api/questions";
	import type { PageData, ActionData } from "./$types";
	import { enhance } from "$app/forms";
	import { goto, replaceState } from "$app/navigation";
	import { browser } from "$app/environment";
	import { questionStore } from "$lib/stores/question";
	import { chaptersStore } from "$lib/stores/chapters";
	import { fetchGroupedChaptersByExamSlug } from "$lib/api/chapters";
	import { findSubjectChaptersForChapter } from "$lib/student-exam/groupedExamData";
	import { navigating } from "$app/stores";

	type Question = PageData["questions"][number];
	type ImageLike =
		| string
		| { url?: string; alt?: string; publicId?: string; version?: number };

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let selectedQuestionIndex = $state<number | null>(null);
	let sidebarCollapsed = $state(false);
	let filterDrawerOpen = $state(false);

	let selectedDifficulties = $state<string[]>([]);
	let selectedKinds = $state<string[]>([]);

	let selectedOption = $state<string | null>(null);
	let isAnswerChecked = $state(false);
	let activeQuestionId = $state<string | null>(null);
	let isEditing = $state(false);

	/** Client-driven question view (shallow routing); stays in sync with server data on full navigations. */
	let effectiveQuestionId = $state<string | null>(null);
	let detailQuestion = $state<Question | null>(null);
	let detailLoading = $state(false);
	let detailLoadSeq = 0;
	let detailAbort: AbortController | null = null;

	$effect(() => {
		if (browser) {
			const params = new URLSearchParams(window.location.search);
			const diffParam = params.get("difficulty");
			const kindParam = params.get("kind");

			selectedDifficulties = diffParam ? diffParam.split(",") : [];
			selectedKinds = kindParam ? kindParam.split(",") : [];
		}
	});

	/** Full navigations only: shallow `replaceState` does not change `data`, so this won't overwrite client-driven id. */
	$effect(() => {
		const qid = data.questionId;
		const det = data.detailedQuestion;
		if (!qid) {
			detailLoadSeq++;
			detailAbort?.abort();
			effectiveQuestionId = null;
			detailQuestion = null;
			detailLoading = false;
			return;
		}
		effectiveQuestionId = qid;
		if (det) {
			detailLoadSeq++;
			detailAbort?.abort();
			detailQuestion = det;
			questionStore.setCachedById(det._id, det);
			detailLoading = false;
		} else {
			detailQuestion = null;
		}
	});

	$effect(() => {
		if (!browser) return;
		const id = effectiveQuestionId;
		if (!id) return;
		if (detailQuestion?._id === id) return;
		const cached = questionStore.getCachedById(id);
		if (cached) {
			detailQuestion = cached;
			return;
		}
		const seq = ++detailLoadSeq;
		detailAbort?.abort();
		detailAbort = new AbortController();
		const signal = detailAbort.signal;
		detailLoading = true;
		void fetchQuestionById(id, undefined, { signal })
			.then((q) => {
				if (seq !== detailLoadSeq || signal.aborted) return;
				detailQuestion = q;
				questionStore.setCachedById(id, q);
			})
			.catch(() => {
				if (seq !== detailLoadSeq || signal.aborted) return;
				detailQuestion = null;
			})
			.finally(() => {
				if (seq === detailLoadSeq) detailLoading = false;
			});
	});

	$effect(() => {
		if (detailQuestion?._id !== activeQuestionId) {
			activeQuestionId = detailQuestion?._id ?? null;
			selectedOption = null;
			isAnswerChecked = false;
			isEditing = false;
		}
		if (form?.success) {
			isEditing = false;
		}
	});

	const PAGINATION_WINDOW = 2;

	/** When layout has no grouped data, hydrate sidebar from the same client API as the exam index. */
	let clientSidebarChapters = $state<PageData["allChapters"]>([]);
	let sidebarHydrateSeq = 0;

	$effect(() => {
		if (!browser) return;
		const rid = data.resolvedChapterId;
		if (!rid || data.allChapters.length > 0) {
			clientSidebarChapters = [];
			return;
		}
		const seq = ++sidebarHydrateSeq;
		void fetchGroupedChaptersByExamSlug(data.examSlug, fetch).then((res) => {
			if (seq !== sidebarHydrateSeq) return;
			if (!res.success) return;
			const list = res.data?.data ?? [];
			const { chapters } = findSubjectChaptersForChapter(list, rid);
			clientSidebarChapters = chapters;
			chaptersStore.setGroupedChapters(data.examSlug, list);
		});
	});

	const filteredChapters = $derived(
		clientSidebarChapters.length > 0 ? clientSidebarChapters : data.allChapters,
	);
	const isLoading = $derived($navigating !== null);

	$effect(() => {
		if (browser && data.subjectSlug) {
			sessionStorage.setItem(
				`exam-${data.examSlug}-subject`,
				data.subjectSlug,
			);
		}
	});

	const storeChapterKey = $derived(data.resolvedChapterId);

	const hasCurrentPage = $derived.by(() => {
		if (!storeChapterKey) return false;
		$questionStore;
		return questionStore.hasPage(storeChapterKey, data.safePage);
	});

	const displayQuestions = $derived.by(() => {
		if (!storeChapterKey) return data.questions;
		$questionStore;
		return hasCurrentPage
			? (questionStore.getQuestionsForPage(
					storeChapterKey,
					data.safePage,
				) ?? [])
			: data.questions;
	});

	const displayPaginationMeta = $derived.by(() => {
		if (!storeChapterKey) return data.paginationMeta;
		$questionStore;
		return hasCurrentPage
			? (questionStore.getPagination(storeChapterKey) ??
					data.paginationMeta)
			: data.paginationMeta;
	});

	$effect(() => {
		if (!browser || !detailQuestion || !effectiveQuestionId) return;
		const idx = displayQuestions.findIndex((q: Question) => q._id === detailQuestion!._id);
		const prefetch = (qid: string | undefined) => {
			if (!qid || questionStore.getCachedById(qid)) return;
			void fetchQuestionById(qid)
				.then((q) => questionStore.setCachedById(qid, q))
				.catch(() => {});
		};
		const run = () => {
			if (idx > 0) prefetch(displayQuestions[idx - 1]?._id);
			if (idx >= 0 && idx < displayQuestions.length - 1) prefetch(displayQuestions[idx + 1]?._id);
		};
		let idleId: ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout> | undefined;
		if (typeof requestIdleCallback !== 'undefined') {
			idleId = requestIdleCallback(run);
			return () => cancelIdleCallback(idleId as number);
		}
		idleId = setTimeout(run, 120);
		return () => clearTimeout(idleId as ReturnType<typeof setTimeout>);
	});

	$effect(() => {
		if (!browser) return;
		if (!storeChapterKey) return;
		if (!data.questions.length) return;
		if (hasCurrentPage) return;

		questionStore.setQuestionsPage(
			storeChapterKey,
			data.safePage,
			data.questions,
			data.paginationMeta ?? undefined,
		);
	});

	const chapterBaseUrl = (chapterParamOverride?: string) =>
		`/student-exam/${data.examSlug}/${encodeURIComponent(chapterParamOverride ?? data.chapterParam)}`;

	const activeFiltersQuery = (opts?: { page?: number }) => {
		const params = new URLSearchParams();
		params.set("page", String(opts?.page ?? 1));
		if (selectedDifficulties.length > 0) {
			params.set("difficulty", selectedDifficulties.join(","));
		}
		if (selectedKinds.length > 0) {
			params.set("kind", selectedKinds.join(","));
		}
		return params.toString();
	};

	function toggleDifficulty(diff: string) {
		if (selectedDifficulties.includes(diff)) {
			selectedDifficulties = selectedDifficulties.filter(
				(d) => d !== diff,
			);
		} else {
			selectedDifficulties = [...selectedDifficulties, diff];
		}
	}

	function toggleKind(kind: string) {
		if (selectedKinds.includes(kind)) {
			selectedKinds = selectedKinds.filter((k) => k !== kind);
		} else {
			selectedKinds = [...selectedKinds, kind];
		}
	}

	function applyFilters() {
		const url = `${chapterBaseUrl()}?${activeFiltersQuery({ page: 1 })}`;
		void goto(url);
		filterDrawerOpen = false;
	}

	function clearFilters() {
		selectedDifficulties = [];
		selectedKinds = [];
		const url = `${chapterBaseUrl()}?page=1`;
		void goto(url);
		filterDrawerOpen = false;
	}

	const chapterHref = (
		chapterParamValue: string,
		opts?: {
			page?: number;
			preview?: boolean;
			reviewStart?: number;
			carry?: boolean;
			questionId?: string;
		},
	) => {
		const params = new URLSearchParams(activeFiltersQuery(opts));
		if (opts?.preview) params.set("preview", "1");
		if (typeof opts?.reviewStart === "number")
			params.set("reviewStart", String(opts.reviewStart));
		if (opts?.carry) params.set("carry", "1");
		if (opts?.questionId) params.set("questionId", opts.questionId);
		return `${chapterBaseUrl(chapterParamValue)}?${params.toString()}`;
	};

	const questionsPageUrl = (p: number) =>
		`${chapterBaseUrl()}?${activeFiltersQuery({ page: p })}`;

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

	function openQuestionPreview(index: number) {
		const q = displayQuestions[index];
		if (!q) return;
		replaceState(
			chapterHref(data.chapterParam, {
				page: data.safePage,
				questionId: q._id,
			}),
			{},
		);
		effectiveQuestionId = q._id;
	}

	function goDetailedPrev() {
		const dq = detailQuestion;
		if (!dq) return;
		const currentIdx = displayQuestions.findIndex(
			(q: Question) => q._id === dq._id,
		);
		if (currentIdx > 0) {
			const prevQ = displayQuestions[currentIdx - 1];
			replaceState(
				chapterHref(data.chapterParam, {
					page: data.safePage,
					questionId: prevQ._id,
				}),
				{},
			);
			effectiveQuestionId = prevQ._id;
		} else if (data.safePage > 1) {
			void goto(
				chapterHref(data.chapterParam, { page: data.safePage - 1 }),
			);
		}
	}

	function goDetailedNext() {
		const dq = detailQuestion;
		if (!dq) return;
		const currentIdx = displayQuestions.findIndex(
			(q: Question) => q._id === dq._id,
		);
		if (currentIdx >= 0 && currentIdx < displayQuestions.length - 1) {
			const nextQ = displayQuestions[currentIdx + 1];
			replaceState(
				chapterHref(data.chapterParam, {
					page: data.safePage,
					questionId: nextQ._id,
				}),
				{},
			);
			effectiveQuestionId = nextQ._id;
		} else if (
			displayPaginationMeta &&
			data.safePage < displayPaginationMeta.lastPage
		) {
			void goto(
				chapterHref(data.chapterParam, { page: data.safePage + 1 }),
			);
		}
	}

	const canGoDetailedPrev = $derived(
		detailQuestion != null
			? displayQuestions.findIndex(
					(q: Question) => q._id === detailQuestion!._id,
				) > 0 || data.safePage > 1
			: false,
	);

	const canGoDetailedNext = $derived(
		detailQuestion != null
			? displayQuestions.findIndex(
					(q: Question) => q._id === detailQuestion!._id,
				) < displayQuestions.length - 1 ||
					!!(
						displayPaginationMeta &&
						data.safePage < displayPaginationMeta.lastPage
					)
			: false,
	);

	function closeQuestionPreview() {
		replaceState(`${chapterBaseUrl()}?${activeFiltersQuery({ page: data.safePage })}`, {});
		effectiveQuestionId = null;
		detailQuestion = null;
		detailLoading = false;
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
		if (typeof image === "string") return image;
		const url = image?.url;
		if (url) return url;
		const publicId = image?.publicId;
		const version = image?.version;
		if (publicId) return `${publicId}::${version ?? ""}`;
		return "";
	}

	function promptImagesOnly(q: Question): ImageLike[] {
		const promptImages =
			(q as any)?.images ?? (q as any)?.prompt?.en?.images ?? [];
		if (!Array.isArray(promptImages) || promptImages.length === 0)
			return [];
		return promptImages as ImageLike[];
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

<div
	class="flex h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]"
>
	<div class="mx-auto flex h-full w-full max-w-7xl overflow-hidden">
		{#if !effectiveQuestionId && !sidebarCollapsed}
			<aside
				class="flex h-full w-64 shrink-0 flex-col border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)]"
			>
				<div class="flex-1 overflow-y-auto p-4">
					<button
						type="button"
						onclick={() => void goto(`/student-exam/${data.examSlug}`)}
						class="mb-4 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--sb-collapse-text)] transition hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M15 18l-6-6 6-6"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Back to Subjects
					</button>

					<div class="mb-3 mt-2 flex items-center justify-between">
						<h2
							class="text-xs font-semibold uppercase tracking-wider text-[var(--sb-nav-text)] opacity-70"
						>
							Chapters
						</h2>
						<!-- <button
							type="button"
							class="rounded-md border border-[var(--sb-border-color)] px-2 py-1 text-xs text-[var(--sb-nav-text)] transition hover:bg-[var(--sb-nav-hover-bg)]"
							onclick={() => (filterDrawerOpen = true)}
						>
							Filter
						</button> -->
					</div>

					<nav class="space-y-1.5">
						{#each filteredChapters as ch (ch._id)}
							<a
								href={chapterHref(String(ch.slug ?? ch._id), {
									page: 1,
								})}
								class="block truncate rounded-lg px-3 py-2 text-sm transition font-[var(--sb-font-nav)] {ch._id ===
								data.resolvedChapterId
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

		{#if !effectiveQuestionId && sidebarCollapsed}
			<button
				type="button"
				onclick={() => (sidebarCollapsed = false)}
				class="fixed left-4 top-4 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-icon)] shadow-sm transition hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-icon)]"
				title="Expand sidebar"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
					<path
						d="M9 18l6-6-6-6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}

		<main class="flex flex-1 flex-col overflow-hidden min-h-0">
			<div
				class="mx-auto flex h-full w-full max-w-6xl flex-col px-4 md:px-6 overflow-hidden min-h-0"
			>
				{#if effectiveQuestionId !== null}
					<div class="py-6 shrink-0">
						<button
							type="button"
							onclick={closeQuestionPreview}
							class="inline-block text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
						>
							← Back to Chapter
						</button>
					</div>
				{/if}

				{#if data.message}
					<div
						class="flex flex-1 items-center justify-center text-semantic-error"
					>
						{data.message}
					</div>
				{:else}
					<div class="py-6 shrink-0">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h1 class="text-2xl font-bold md:text-3xl">
									{data.chapter?.name?.en ??
										data.chapterParam}
								</h1>
								{#if displayPaginationMeta}
									<p
										class="mt-2 text-sm text-[var(--page-text-muted)]"
									>
										{displayPaginationMeta.total} questions •
										Page {data.safePage}
										of {displayPaginationMeta.lastPage}
									</p>
								{/if}
							</div>

							{#if !effectiveQuestionId}
								<button
									type="button"
									class="rounded-lg border border-[var(--page-card-border)] px-3 py-1.5 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
									onclick={() => (filterDrawerOpen = true)}
								>
									Filters
								</button>
							{/if}
						</div>
					</div>

					{#if displayQuestions.length === 0}
						<div class="flex flex-1 items-center justify-center">
							<div
								class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]"
							>
								No questions found.
							</div>
						</div>
					{:else if !effectiveQuestionId}
						{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
							<div
								class="shrink-0 border-b border-[var(--page-card-border)] pb-4"
							>
								<div
									class="flex flex-wrap items-center justify-center gap-1.5"
								>
									{#if data.safePage > 1}
										<a
											class="pagination-btn"
											href={questionsPageUrl(1)}
											>← First</a
										>
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage - 1,
											)}>Prev</a
										>
									{/if}

									{#each visiblePageNumbers as pageNumber}
										<a
											class="pagination-btn px-3.5 {pageNumber ===
											data.safePage
												? 'page-link-active'
												: ''}"
											href={questionsPageUrl(pageNumber)}
										>
											{pageNumber}
										</a>
									{/each}

									{#if data.safePage < displayPaginationMeta.lastPage}
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage + 1,
											)}>Next</a
										>
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												displayPaginationMeta.lastPage,
											)}>Last →</a
										>
									{/if}
								</div>
							</div>
						{/if}

						<div class="flex-1 overflow-y-auto pb-6">
							{#if isLoading}
								<div class="flex flex-col gap-3">
									{#each Array(10) as _, i}
										<div
											class="animate-pulse rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3.5"
										>
											<div
												class="flex items-baseline gap-3"
											>
												<div
													class="h-4 w-8 shrink-0 rounded bg-[var(--page-bg)]"
												></div>
												<div class="flex-1 space-y-2">
													<div
														class="h-4 w-full rounded bg-[var(--page-bg)]"
													></div>
													<div
														class="h-4 w-3/4 rounded bg-[var(--page-bg)]"
													></div>
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
											onclick={() =>
												openQuestionPreview(index)}
										>
											<div
												class="flex items-baseline gap-3"
											>
												<div
													class="shrink-0 text-xs font-medium text-[var(--page-text-muted)] opacity-70 mt-1"
												>
													Q{(data.safePage - 1) *
														(displayPaginationMeta?.limit ??
															10) +
														index +
														1}
												</div>
												<div
													class="flex-1 text-[1.02rem] leading-[1.8] text-[var(--page-text)]"
												>
													<MathText
														content={questionPromptEnContent(
															q,
														)}
													/>
													{#if promptImagesOnly(q).length}
														<div
															class="mt-3 grid grid-cols-2 gap-2.5"
														>
															{#each promptImagesOnly(q) as img, imgIdx (`main-${q._id}-${imgIdx}`)}
																{@const src =
																	imageSrc(
																		img as ImageLike,
																	)}
																{#if src}
																	<img
																		{src}
																		alt={imageAlt(
																			img as ImageLike,
																		)}
																		class="max-h-40 w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
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
							<div
								class="border-t border-[var(--page-card-border)] py-6 shrink-0"
							>
								<div
									class="flex flex-wrap items-center justify-center gap-1.5"
								>
									{#if data.safePage > 1}
										<a
											class="pagination-btn"
											href={questionsPageUrl(1)}
											>← First</a
										>
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage - 1,
											)}>Prev</a
										>
									{/if}

									{#each visiblePageNumbers as pageNumber}
										<a
											class="pagination-btn px-3.5 {pageNumber ===
											data.safePage
												? 'page-link-active'
												: ''}"
											href={questionsPageUrl(pageNumber)}
										>
											{pageNumber}
										</a>
									{/each}

									{#if data.safePage < displayPaginationMeta.lastPage}
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage + 1,
											)}>Next</a
										>
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												displayPaginationMeta.lastPage,
											)}>Last →</a
										>
									{/if}
								</div>
							</div>
						{/if}
					{:else}
						<div class="flex-1 overflow-y-auto pb-6 mt-4">
							<div
								class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--page-bg)] p-6 shadow-sm flex flex-col min-h-full"
							>
								{#if detailLoading && !detailQuestion}
									<div class="flex flex-col gap-4 animate-pulse" aria-busy="true">
										<div class="h-6 w-40 rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-full max-w-2xl rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-full max-w-xl rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-2/3 rounded bg-[var(--page-card-border)]"></div>
										<div class="mt-6 grid grid-cols-2 gap-3">
											<div class="h-24 rounded-xl bg-[var(--page-card-border)]"></div>
											<div class="h-24 rounded-xl bg-[var(--page-card-border)]"></div>
										</div>
									</div>
								{:else if !detailQuestion}
									<div class="text-center text-[var(--page-text-muted)] py-12">
										Unable to load this question.
									</div>
								{:else if isEditing}
									<form
										method="POST"
										action="?/updateQuestion"
										use:enhance={() => {
											return ({ update }) => {
												update({ reset: false });
											};
										}}
										class="flex flex-col flex-1 h-full min-h-0 relative"
									>
										{#if form?.message}
											<div
												class="mb-4 rounded-md bg-semantic-error/10 p-3 text-sm text-semantic-error border border-semantic-error/20"
											>
												{form.message}
											</div>
										{/if}

										<input
											type="hidden"
											name="questionId"
											value={detailQuestion._id}
										/>

										<!-- Form body -->
										<div class="mb-5">
											<label
												class="block text-sm font-semibold text-[var(--page-text)] mb-2"
												for="promptContent"
												>Question Content</label
											>
											<textarea
												name="promptContent"
												id="promptContent"
												class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-[1.05rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
												rows="5"
												>{detailQuestion.prompt?.en?.content ?? ""}</textarea
											>
										</div>

										<!-- Options Grid for Editing -->
										{#if detailQuestion.prompt?.en?.options?.length}
											<div class="mb-5">
												<label
													class="block text-sm font-semibold text-[var(--page-text)] mb-3"
													>Options</label
												>
												<div
													class="grid grid-cols-1 md:grid-cols-2 gap-4"
												>
													{#each detailQuestion.prompt.en.options as option, i (option.identifier)}
														<div
															class="flex flex-col gap-2 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4 shadow-sm"
														>
															<div
																class="flex items-center gap-2"
															>
																<span
																	class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]"
																	>{option.identifier}</span
																>
																<span
																	class="text-xs font-semibold text-[var(--page-text-muted)]"
																	>Content</span
																>
															</div>
															<input
																type="hidden"
																name="option_{i}_id"
																value={option.identifier}
															/>
															<textarea
																name="option_{i}_content"
																class="w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] p-2.5 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
																rows="2"
																>{option.content ??
																	""}</textarea
															>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										<!-- Explanation -->
										<div class="mb-6">
											<label
												class="block text-sm font-semibold text-[var(--page-text)] mb-2"
												for="explanationContent"
												>Solution / Explanation</label
											>
											<textarea
												name="explanationContent"
												id="explanationContent"
												class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-[1rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
												rows="4"
												>{detailQuestion.prompt?.en?.explanation ?? ""}</textarea
											>
										</div>

										<!-- Footer Buttons for Edit -->
										<div
											class="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-[var(--sh-exam-card-border)] pt-5"
										>
											<button
												type="button"
												class="rounded-lg border border-[var(--page-card-border)] px-5 py-2.5 text-sm font-semibold text-[var(--page-text-muted)] hover:bg-[var(--sh-exam-card-hover-border)]/20 transition"
												onclick={() =>
													(isEditing = false)}
												>Cancel</button
											>
											<button
												type="submit"
												class="rounded-lg bg-[var(--page-link)] text-white px-6 py-2.5 text-sm font-bold shadow-md shadow-[var(--page-link)]/20 hover:bg-[var(--page-link-hover)] hover:shadow-lg transition"
												>Save Changes</button
											>
										</div>
									</form>
								{:else}
									<!-- Question Header -->
									<div
										class="mb-5 flex flex-wrap items-center gap-3"
									>
										<div
											class="inline-flex rounded-md border border-[var(--page-link)]/20 bg-[var(--page-link)]/10 px-2 py-1 text-xs font-semibold text-[var(--page-link)]"
										>
											{(detailQuestion as any).examSlug
												?.replace("-", " ")
												.toUpperCase()}
											{(detailQuestion as any).year ?? ""}
										</div>
										<div
											class="text-xs font-semibold uppercase text-[var(--page-text-muted)] opacity-80"
										>
											{detailQuestion.kind}
										</div>
										<div
											class="text-xs font-semibold uppercase text-[var(--page-text-muted)] opacity-80"
										>
											{(detailQuestion as any).marks} Marks
										</div>
										<button
											type="button"
											onclick={() => (isEditing = true)}
											class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--page-card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--page-text)] shadow-sm hover:bg-[var(--sh-exam-card-hover-border)]/20 transition"
										>
											<svg
												width="12"
												height="12"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M12 20h9"></path>
												<path
													d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
												></path>
											</svg>
											Edit
										</button>
									</div>

									<!-- Question Content -->
									<div
										class="mb-8 text-[1.1rem] leading-relaxed text-[var(--page-text)]"
									>
										<MathText
											content={questionPromptEnContent(
												detailQuestion,
											)}
										/>
										{#if promptImagesOnly(detailQuestion).length}
											<div
												class="mt-4 grid grid-cols-2 gap-3"
											>
												{#each promptImagesOnly(detailQuestion) as img, imgIdx (`main-${detailQuestion._id}-${imgIdx}`)}
													{@const src = imageSrc(
														img as ImageLike,
													)}
													{#if src}
														<img
															{src}
															alt={imageAlt(
																img as ImageLike,
															)}
															class="max-h-60 w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain shadow-sm"
															loading="lazy"
														/>
													{/if}
												{/each}
											</div>
										{/if}
									</div>

									<!-- Options Grid -->
									{#if detailQuestion.prompt?.en?.options?.length}
										<div
											class="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
										>
											{#each detailQuestion.prompt.en.options as option (option.identifier)}
												{@const isSelected =
													selectedOption ===
													option.identifier}
												{@const isCorrectData = (
													detailQuestion as any
												).correct?.identifiers?.includes(
													option.identifier,
												)}
												{@const showAsCorrect =
													isAnswerChecked &&
													isCorrectData}
												{@const showAsWrong =
													isAnswerChecked &&
													isSelected &&
													!isCorrectData}

												<button
													type="button"
													class="group relative flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 {showAsCorrect
														? 'border-semantic-success bg-semantic-success/5 shadow-[0_0_15px_rgba(22,163,74,0.1)]'
														: showAsWrong
															? 'border-semantic-error bg-semantic-error/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
															: isSelected
																? 'border-[var(--page-link)] bg-[var(--page-link)]/5 ring-1 ring-[var(--page-link)]'
																: 'border-[var(--sh-exam-card-border)] bg-[var(--page-bg)]/40 hover:border-[var(--page-link)]/50 hover:bg-[var(--page-bg)]'}"
													disabled={isAnswerChecked}
													onclick={() =>
														!isAnswerChecked &&
														(selectedOption =
															option.identifier)}
												>
													<span
														class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold {showAsCorrect
															? 'border-semantic-success bg-semantic-success text-white'
															: showAsWrong
																? 'border-semantic-error bg-semantic-error text-white'
																: isSelected
																	? 'border-[var(--page-link)] bg-[var(--page-link)] text-white'
																	: 'border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-[var(--page-link)] group-hover:bg-[var(--page-link)]/20'}"
													>
														{showAsCorrect
															? "✓"
															: showAsWrong
																? "✕"
																: option.identifier}
													</span>
													<div
														class="min-w-0 flex-1 break-words"
													>
														<MathText
															content={option.content}
														/>
														{#if option.images?.length}
															<div
																class="mt-3 flex flex-wrap gap-2"
															>
																{#each option.images as img, imgIdx (`opt-${detailQuestion._id}-${option.identifier}-${imgIdx}`)}
																	{@const src =
																		imageSrc(
																			img as ImageLike,
																		)}
																	{#if src}
																		<img
																			{src}
																			alt={imageAlt(
																				img as ImageLike,
																			)}
																			class="max-h-32 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-bg)] object-contain shadow-sm"
																			loading="lazy"
																		/>
																	{/if}
																{/each}
															</div>
														{/if}
													</div>
												</button>
											{/each}
										</div>
									{/if}

									<!-- Explanation -->
									{#if isAnswerChecked && detailQuestion.prompt?.en?.explanation}
										<div
											class="mb-8 rounded-xl border border-[var(--page-link)]/20 bg-[var(--page-link)]/5 p-5 animate-in fade-in slide-in-from-bottom-2"
										>
											<div
												class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--page-link)]"
											>
												<svg
													width="20"
													height="20"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path
														d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
													/>
												</svg>
												ExamFlow Solution
											</div>
											<div
												class="text-[0.95rem] leading-relaxed text-[var(--page-text)]"
											>
												<MathText
													content={detailQuestion.prompt.en.explanation}
												/>
												{#if detailQuestion.prompt.en.explanationImages?.length}
													<div
														class="mt-4 flex flex-wrap gap-3"
													>
														{#each detailQuestion.prompt.en.explanationImages as img, imgIdx (`exp-${detailQuestion._id}-${imgIdx}`)}
															{@const src =
																imageSrc(
																	img as ImageLike,
																)}
															{#if src}
																<img
																	{src}
																	alt={imageAlt(
																		img as ImageLike,
																	)}
																	class="max-h-48 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																	loading="lazy"
																/>
															{/if}
														{/each}
													</div>
												{/if}
											</div>
										</div>
									{/if}

									<!-- Footer Buttons -->
									<div
										class="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-[var(--sh-exam-card-border)] pt-5"
									>
										<button
											type="button"
											class="min-w-[100px] rounded-lg border border-[var(--page-link)]/50 bg-[var(--page-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--page-link)] transition hover:bg-[var(--page-link)]/10 disabled:opacity-40 disabled:hover:bg-[var(--page-bg)]"
											disabled={!canGoDetailedPrev}
											onclick={goDetailedPrev}
										>
											Previous
										</button>

										<button
											type="button"
											class="min-w-[180px] rounded-lg bg-[var(--page-link)] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--page-link)]/20 transition hover:bg-[var(--page-link-hover)] hover:shadow-lg disabled:opacity-50"
											onclick={() => {
												if (
													!isAnswerChecked &&
													selectedOption
												)
													isAnswerChecked = true;
											}}
											disabled={isAnswerChecked ||
												!selectedOption}
										>
											Check Answer
										</button>

										<button
											type="button"
											class="min-w-[100px] rounded-lg border border-[var(--page-link)]/50 bg-[var(--page-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--page-link)] transition hover:bg-[var(--page-link)]/10 disabled:opacity-40 disabled:hover:bg-[var(--page-bg)]"
											disabled={!canGoDetailedNext}
											onclick={goDetailedNext}
										>
											Next
										</button>
									</div>
								{/if}
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
		class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={() => (filterDrawerOpen = false)}
		onkeydown={(e) =>
			e.key === "Escape" ? (filterDrawerOpen = false) : null}
	></div>

	<aside
		class="fixed left-0 top-0 z-40 h-full w-[300px] border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)] p-6 shadow-2xl"
	>
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-base font-semibold text-[var(--page-text)]">
				Filters
			</h3>
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
				<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">
					Difficulty
				</div>
				<div class="flex flex-wrap gap-2.5">
					{#each ["easy", "medium", "hard"] as diff}
						<button
							type="button"
							onclick={() => toggleDifficulty(diff)}
							class="rounded-lg border px-3 py-1.5 text-xs font-medium transition {selectedDifficulties.includes(
								diff,
							)
								? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
								: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
						>
							{diff}
						</button>
					{/each}
				</div>
			</div>

			<div>
				<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">
					Type
				</div>
				<div class="grid gap-2.5">
					{#each ["MCQ", "MSQ", "TRUE_FALSE", "INTEGER", "FILL_BLANK", "COMPREHENSION_PASSAGE"] as kindOption}
						<button
							type="button"
							onclick={() => toggleKind(kindOption)}
							class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {selectedKinds.includes(
								kindOption,
							)
								? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
								: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
						>
							{kindOption}
						</button>
					{/each}
				</div>
			</div>

			<div
				class="flex items-center gap-3 pt-4 border-t border-[var(--sb-border-color)]"
			>
				<button
					type="button"
					class="flex-1 rounded-xl border border-[var(--sb-border-color)] px-3 py-2 text-sm font-medium text-[var(--sb-nav-text)] hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)] transition"
					onclick={clearFilters}
				>
					Clear
				</button>
				<button
					type="button"
					class="flex-1 rounded-xl bg-[var(--page-link)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--page-link-hover)] transition"
					onclick={applyFilters}
				>
					Apply
				</button>
			</div>
		</div>
	</aside>
{/if}
