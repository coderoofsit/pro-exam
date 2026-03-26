<script lang="ts">
	import { browser } from '$app/environment';
	import MathText from '$lib/components/MathText.svelte';
	import type { Question } from '$lib/api/questions';
	import type { Chapter, ChaptersHierarchyResponse } from '$lib/api/chapters';
	import { chapterQuestionsPath } from '$lib/chapterRoutes';
	import { chapterStore } from '$lib/stores/chapter';
	import { questionStore } from '$lib/stores/question';

	let { data } = $props<{
		data: {
			examSlug: string;
			boardSlug: string;
			subjectSlug: string;
			chapterParam: string;
			safePage: number;
			resolvedChapterId: string | null;
			hierarchy: ChaptersHierarchyResponse | null;
			subject: any | null;
			chapterGroupsChapters: Record<string, Chapter[]>;
			questions: Question[];
			paginationMeta: { total: number; lastPage: number; limit: number } | null;
			message: string | null;
		};
	}>();

	let examSlug = $state('');
	let subjectSlug = $state('');
	let chapterParam = $state('');
	let safePage = $state(1);

	let hierarchy = $state<ChaptersHierarchyResponse | null>(null);
	let subject = $state<any | null>(null);

	// Template expects `chapterStoreState.chaptersByChapterGroupId[...]`.
	let chapterStoreState = $state<{ chaptersByChapterGroupId: Record<string, Chapter[]> }>({
		chaptersByChapterGroupId: {}
	});

	// SSR already fetched questions for this page.
	const isQuestionsLoading = false;
	let questionsFetchError = $state<string | null>(null);

	let resolvedChapterId = $state<string | null>(null);
	let displayQuestionsCorrect = $state<Question[]>([]);
	let paginationMeta = $state<{ total: number; lastPage: number; limit: number } | null>(null);

	$effect(() => {
		examSlug = data.examSlug;
		subjectSlug = data.subjectSlug;
		chapterParam = data.chapterParam;
		safePage = data.safePage;

		hierarchy = data.hierarchy;
		subject = data.subject;
		chapterStoreState = { chaptersByChapterGroupId: data.chapterGroupsChapters };

		questionsFetchError = data.message;
		resolvedChapterId = data.resolvedChapterId;
		displayQuestionsCorrect = data.questions;
		paginationMeta = data.paginationMeta;
	});

	// Seed stores from SSR data so navigation can reuse caches.
	$effect(() => {
		if (!browser) return;
		if (!data?.boardSlug) return;
		if (data.hierarchy) {
			if (!chapterStore.hasHierarchy(data.boardSlug, data.examSlug)) {
				chapterStore.setHierarchy(data.boardSlug, data.examSlug, data.hierarchy);
			}
		}

		for (const [chapterGroupId, chapters] of Object.entries(data.chapterGroupsChapters ?? {})) {
			if (!chapterGroupId) continue;
			if (chapterStore.hasChaptersForChapterGroup(chapterGroupId)) continue;
			if (Array.isArray(chapters) && chapters.length) {
				chapterStore.setChaptersByChapterGroupId(chapterGroupId, chapters);
			}
		}

		if (data.resolvedChapterId && data.paginationMeta) {
			const cid = data.resolvedChapterId;
			const page = data.safePage;
			if (!questionStore.hasPage(cid, page)) {
				questionStore.setQuestionsPage(cid, page, data.questions, data.paginationMeta);
			}
		}
	});

	// Template uses this only in the loading branch.
	const hasCurrentPageInStore = true;

	const PAGINATION_WINDOW = 2;
	const questionsPageUrl = (p: number) =>
		`/student/exams/${examSlug}/subject/${subjectSlug}/questions/${chapterParam}?page=${p}`;
	const paginationStartPage = $derived(paginationMeta ? Math.max(1, safePage - PAGINATION_WINDOW) : 1);
	const paginationEndPage = $derived(paginationMeta ? Math.min(paginationMeta.lastPage, safePage + PAGINATION_WINDOW) : 1);
	const visiblePageNumbers = $derived(
		Array.from({ length: Math.max(0, paginationEndPage - paginationStartPage + 1) }, (_, i) => paginationStartPage + i)
	);

	function tagClassForDifficulty(d: string): string {
		const k = d?.toLowerCase();
		if (k === 'easy') return 'q-tag q-tag--easy';
		if (k === 'hard') return 'q-tag q-tag--hard';
		return 'q-tag q-tag--medium';
	}

	function classForKind(k: string): string {
		const c = k?.toLowerCase();
		if (c === 'mcq') return 'q-kind q-kind--mcq';
		if (c === 'msq') return 'q-kind q-kind--msq';
		if (c === 'nat') return 'q-kind q-kind--nat';
		if (c === 'tf') return 'q-kind q-kind--tf';
		return 'q-kind q-kind--default';
	}
</script>

<svelte:head>
	<title>Questions — {paginationMeta ? `Page ${safePage}` : 'Loading'}</title>
</svelte:head>

<style>
	.math-content :global(mjx-container),
	.math-content :global(.MathJax),
	.math-content :global(.katex-html) {
		display: inline !important;
	}
	.math-content :global(p) {
		margin: 0;
		line-height: 2;
	}
	.option-badge {
		font-family: 'SF Mono', 'Fira Code', monospace;
	}
	.question-card {
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}
</style>

<div class="flex min-h-0 items-start bg-[var(--page-bg)] text-[var(--page-text)]">
	<aside
		class="sticky top-0 z-[5] flex max-h-[calc(100dvh-7rem)] w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-4"
	>
		<a
			href="/student/exams/{examSlug}/subject/{subjectSlug}"
			class="mb-4 flex items-center gap-2 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
				<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Back to chapters
		</a>
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--page-text-muted)]">Subjects</h2>
		{#if hierarchy?.subjects}
			<nav class="space-y-0.5">
				{#each hierarchy.subjects as s (s._id)}
					{#if s.slug === subjectSlug}
						<div
							class="rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] px-3 py-2 text-sm font-medium text-[var(--page-text)]"
						>
							{s.name?.en ?? s.slug}
						</div>
						{#if subject?.chapterGroups && chapterStoreState}
							<div class="mt-2 pl-3">
								{#each subject.chapterGroups as cg (cg._id)}
									<div class="mb-2 text-xs font-medium text-[var(--page-text-muted)]">{cg.name?.en ?? cg.slug}</div>
									{#if chapterStoreState.chaptersByChapterGroupId[cg._id]}
										{#each chapterStoreState.chaptersByChapterGroupId[cg._id] as ch (ch._id)}
											<a
												href={chapterQuestionsPath(examSlug ?? '', subjectSlug ?? '', ch)}
												class="mb-1 block truncate rounded px-2 py-1 text-sm transition {ch._id === resolvedChapterId
													? 'border border-[var(--page-link)]/40 bg-[var(--page-link)]/10 font-medium text-[var(--page-link)]'
													: 'text-[var(--page-text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]'}"
											>
												{ch.order}. {ch.name?.en ?? ch.slug}
											</a>
										{/each}
									{/if}
								{/each}
							</div>
						{/if}
					{:else}
						<a
							href="/student/exams/{examSlug}/subject/{s.slug}"
							class="block rounded-lg px-3 py-2 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
						>
							{s.name?.en ?? s.slug}
						</a>
					{/if}
				{/each}
			</nav>
		{/if}
	</aside>

	<main class="relative isolate min-w-0 flex-1">
		<div
			class="sticky top-0 z-30 border-b border-[var(--page-card-border)] bg-[var(--page-card-bg)] shadow-sm"
		>
			<div class="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3">
				<a
					href="/student/exams/{examSlug}/subject/{subjectSlug}"
					class="flex items-center gap-1.5 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
				>
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
						<path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					Chapters
				</a>
				<div class="flex items-center gap-4 text-xs text-[var(--page-text-muted)]">
					<span class="flex items-center gap-1.5">
						<span class="h-1.5 w-1.5 rounded-full bg-[var(--page-link)]"></span>
						{paginationMeta?.total ?? 0} questions
					</span>
					<span class="text-[var(--page-card-border)]">|</span>
					<span>Page {safePage} of {paginationMeta?.lastPage ?? 1}</span>
				</div>
			</div>
		</div>

		<div class="relative z-0 mx-auto w-full max-w-4xl px-5 py-10">
			{#if isQuestionsLoading && !hasCurrentPageInStore && !questionsFetchError}
				<div class="flex min-h-[40vh] items-center justify-center text-[var(--page-text-muted)]">Loading…</div>
			{:else if questionsFetchError}
				<div class="flex min-h-[40vh] items-center justify-center text-semantic-error">{questionsFetchError}</div>
			{:else if resolvedChapterId && (displayQuestionsCorrect.length > 0 || paginationMeta)}
				<div class="mb-8">
					<h1 class="mb-1 text-2xl font-semibold tracking-tight text-[var(--page-text)]">All Questions</h1>
					<p class="text-sm text-[var(--page-text-muted)]">Chapter questions</p>
				</div>

				{#if displayQuestionsCorrect.length === 0}
					<div
						class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-12 text-center text-[var(--page-text-muted)]"
					>
						No questions found.
					</div>
				{:else}
					<div class="flex flex-col gap-4">
						{#each displayQuestionsCorrect as question, index}
							{@const qNumber = (safePage - 1) * (paginationMeta?.limit ?? 10) + index + 1}

							<div
								class="question-card overflow-hidden rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)]"
							>
								<div
									class="flex items-center justify-between border-b border-[var(--page-card-border)] px-6 py-4"
								>
									<span
										class="rounded-md bg-[var(--page-bg)] px-2 py-1 font-mono text-xs text-[var(--page-text-muted)]"
									>
										Q{qNumber}
									</span>
									<div class="flex items-center gap-2">
										<span class={classForKind(question.kind)}>{question.kind}</span>
										<span class={tagClassForDifficulty(question.difficulty)}>
											<span class="q-tag-dot"></span>
											{question.difficulty}
										</span>
									</div>
								</div>
								<div class="px-6 py-5">
									<div
										class="math-content overflow-x-auto text-[1.0625rem] leading-[1.85] text-[var(--page-text)]"
									>
										<MathText content={question.prompt.en.content} />
									</div>
									{#if question.prompt.en.options?.length}
										<div class="mt-5 grid gap-2.5">
											{#each question.prompt.en.options as option}
												<div
													class="group flex items-start gap-3.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3.5 transition hover:border-[var(--page-link)]/35 hover:bg-[var(--page-bg)]"
												>
													<span
														class="option-badge mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]"
													>
														{option.identifier}
													</span>
													<div
														class="math-content flex-1 overflow-x-auto text-[1.0625rem] leading-[1.85] text-[var(--page-text)]"
													>
														<MathText content={option.content} />
													</div>
												</div>
											{/each}
										</div>
									{/if}
									{#if question.prompt.en.explanation}
										<details class="group mt-5">
											<summary
												class="flex w-fit cursor-pointer list-none items-center gap-2 select-none text-sm font-medium text-[var(--page-text-muted)] hover:text-[var(--page-text)]"
											>
												<svg class="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
												</svg>
												Show explanation
											</summary>
											<div
												class="mt-3 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-4"
											>
												<div
													class="math-content overflow-x-auto text-sm leading-[1.85] text-[var(--page-text-muted)]"
												>
													<MathText content={question.prompt.en.explanation} />
												</div>
											</div>
										</details>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-10 flex flex-wrap items-center justify-center gap-1.5">
						{#if safePage > 1}
							<a class="pagination-btn" href={questionsPageUrl(1)}>← First</a>
							<a class="pagination-btn" href={questionsPageUrl(safePage - 1)}>Prev</a>
						{/if}
						{#each visiblePageNumbers as pageNumber}
							<a
								class="pagination-btn px-3.5 {pageNumber === safePage ? 'page-link-active' : ''}"
								href={questionsPageUrl(pageNumber)}
							>
								{pageNumber}
							</a>
						{/each}
						{#if paginationMeta && safePage < paginationMeta.lastPage}
							<a class="pagination-btn" href={questionsPageUrl(safePage + 1)}>Next</a>
							<a class="pagination-btn" href={questionsPageUrl(paginationMeta.lastPage)}>Last →</a>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</main>
</div>
