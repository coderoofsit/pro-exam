<script lang="ts">
	import { browser } from '$app/environment';
	import Exam from '$lib/components/Exam.svelte';
	import { examStore, STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
	import { fetchExamsPage } from '$lib/api/exams';
	import type { Exam as ExamApi } from '$lib/api/exams';

	let { data } = $props<{
		data: {
			exams: ExamApi[];
			total: number;
			lastPage: number;
			limit: number;
			currentPage: number;
			message: string | null;
		};
	}>();

	const currentPage = $derived(data.currentPage);

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const hasCurrentPage = $derived.by(() => {
		$examStore;
		return examStore.hasPage(currentPage, STUDENT_EXAMS_PAGE_SIZE);
	});

	// Prefer cached store; fall back to server data for the first render.
	const displayExams = $derived.by(() => {
		$examStore;
		return examStore.hasPage(currentPage, STUDENT_EXAMS_PAGE_SIZE)
			? $examStore.examsByPage[currentPage] ?? []
			: data.exams;
	});

	const effectiveLastPage = $derived.by(() => {
		$examStore;
		return $examStore.lastPage > 1 ? $examStore.lastPage : data.lastPage;
	});

	const paginationWindow = 2;
	const startPage = $derived(Math.max(1, currentPage - paginationWindow));
	const endPage = $derived(Math.min(effectiveLastPage, currentPage + paginationWindow));
	const visiblePages = $derived(Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i));

	// 1) Seed store with server-provided page so future navigations reuse it.
	$effect(() => {
		if (!browser) return;
		if (!data.exams.length) return; // server didn't fetch this page
		if (hasCurrentPage) return;

		examStore.setExamsPage(currentPage, data.exams, {
			total: data.total,
			lastPage: data.lastPage,
			limit: data.limit
		});
	});

	// 2) For pages where SSR returned empty, fetch only if missing from store.
	$effect(() => {
		if (!browser) return;
		if (isLoading) return;
		if (data.exams.length) return; // server provided this page
		if (hasCurrentPage) return;

		isLoading = true;
		error = null;

		fetchExamsPage(currentPage, STUDENT_EXAMS_PAGE_SIZE)
			.then((res) => {
				examStore.setExamsPage(currentPage, res.data, {
					total: res.total,
					lastPage: res.lastPage,
					limit: res.limit
				});
			})
			.catch((e) => {
				error = e instanceof Error ? e.message : 'Failed to fetch exams';
			})
			.finally(() => {
				isLoading = false;
			});
	});

	function buildPageLink(pageNum: number) {
		return pageNum <= 1 ? '/student/exams' : `/student/exams?page=${pageNum}`;
	}
</script>



<svelte:head>

	<title>All Exams</title>

</svelte:head>



{#if error}
	<div class="flex min-h-screen items-center justify-center text-semantic-error">{error}</div>
{:else if isLoading || (data.exams.length === 0 && !hasCurrentPage)}
	<div class="flex min-h-screen items-center justify-center text-[var(--page-text-muted)]">Loading...</div>
{:else}
	<Exam exams={displayExams} boardName="All" />

	{#if effectiveLastPage > 1}
		<div class="mx-auto max-w-7xl px-4 pb-10">
			<div class="mt-8 flex flex-wrap items-center justify-center gap-1.5">
				{#if currentPage > 1}
					<a class="pagination-btn" href={buildPageLink(1)}>← First</a>
					<a class="pagination-btn" href={buildPageLink(currentPage - 1)}>Prev</a>
				{/if}

				{#each visiblePages as pageNum}
					<a
						class="pagination-btn px-3.5 {pageNum === currentPage ? 'page-link-active' : ''}"
						href={buildPageLink(pageNum)}
					>
						{pageNum}
					</a>
				{/each}

				{#if currentPage < effectiveLastPage}
					<a class="pagination-btn" href={buildPageLink(currentPage + 1)}>Next</a>
					<a class="pagination-btn" href={buildPageLink(effectiveLastPage)}>Last →</a>
				{/if}
			</div>
		</div>
	{/if}
{/if}

