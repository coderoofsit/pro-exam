<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Exam from '$lib/components/Exam.svelte';
	import { examStore, STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';
	import { fetchExamsPage } from '$lib/api/exams';
	import type { Exam as ExamApi } from '$lib/api/exams';

	interface ExamsData {
		data: ExamApi[];
		total: number;
		lastPage: number;
		limit: number;
		currentPage: number;
	}

let {
	data,
	basePath = '/student/exams'
} = $props<{
		data: {
			currentPage: number;
			streamed: {
				examsData: Promise<ExamsData>;
			}
	};
	basePath?: string;
	}>();

	const currentPage = $derived(data.currentPage);
	const isPyq = $derived(page.url.searchParams.get('pyq') === 'true');

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const hasCurrentPage = $derived.by(() => {
		$examStore;
		return examStore.hasPage(currentPage, STUDENT_EXAMS_PAGE_SIZE);
	});

	function buildPageLink(pageNum: number) {
		return pageNum <= 1 ? basePath : `${basePath}?page=${pageNum}`;
	}

	$effect(() => {
		if (!browser) return;
		data.streamed.examsData.then((examsData) => {
			if (!examsData?.data.length) return;
			if (hasCurrentPage) return;
			examStore.setExamsPage(currentPage, examsData.data, {
				total: examsData.total,
				lastPage: examsData.lastPage,
				limit: examsData.limit
			});
		});
	});
</script>

<svelte:head>
	<title>All Exams</title>
</svelte:head>

{#await data.streamed.examsData}
	<div class="mx-auto max-w-7xl px-4 py-8">
		<Skeleton width="w-32" height="h-8" className="mb-6" />
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each Array(10) as _}
				<div class="flex h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-4">
					<Skeleton width="w-10" height="h-10" rounded="rounded-full" />
					<Skeleton width="w-24" height="h-4" />
				</div>
			{/each}
		</div>
	</div>
{:then examsData}
	{@const displayExams = hasCurrentPage ? ($examStore.examsByPage[currentPage] ?? []) : examsData.data}
	{@const effectiveLastPage = $examStore.lastPage > 1 ? $examStore.lastPage : examsData.lastPage}
	{@const paginationWindow = 2}
	{@const startPage = Math.max(1, currentPage - paginationWindow)}
	{@const endPage = Math.min(effectiveLastPage, currentPage + paginationWindow)}
	{@const visiblePages = Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i)}


	<Exam exams={displayExams} boardName="All" pyq={isPyq} hideBoardTitle={true} basePath={basePath} />

	{#if effectiveLastPage > 1}
		<div class="mx-auto max-w-7xl px-4 pb-10">
			<div class="mt-8 flex flex-wrap items-center justify-center gap-1.5">
				{#if currentPage > 1}
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
				{#if !visiblePages.includes(effectiveLastPage)}
					<span class="pagination-btn px-3.5 pointer-events-none opacity-70">...</span>
					<a class="pagination-btn px-3.5" href={buildPageLink(effectiveLastPage)}
						>{effectiveLastPage}</a
					>
				{/if}

				{#if currentPage < effectiveLastPage}
					<a class="pagination-btn" href={buildPageLink(currentPage + 1)}>Next</a>
				{/if}
			</div>
		</div>
	{/if}
{:catch pageError}
	<div class="flex min-h-[40vh] items-center justify-center text-semantic-error">
		{pageError.message || 'Failed to fetch exams'}
	</div>
{/await}

