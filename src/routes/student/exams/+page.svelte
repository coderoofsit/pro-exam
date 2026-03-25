<script lang="ts">

	import { page } from '$app/stores';

	import Exam from '$lib/components/Exam.svelte';

	import { examStore, STUDENT_EXAMS_PAGE_SIZE } from '$lib/stores/exam';

	import { fetchExamsPage } from '$lib/api/exams';



	const currentPage = $derived(Math.max(1, Number($page.url.searchParams.get('page')) || 1));



	let loading = $state(false);

	let error = $state<string | null>(null);



	const displayExams = $derived($examStore.examsByPage[currentPage] ?? []);

	const { total, lastPage, limit } = $derived($examStore);

	/** Must read `$examStore` so this updates when `setExamsPage` runs (`hasPage` uses `get()` internally, which is not a reactive dependency). */
	const hasCurrentPage = $derived.by(() => {
		$examStore;
		return examStore.hasPage(currentPage, STUDENT_EXAMS_PAGE_SIZE);
	});



	$effect(() => {

		if (examStore.hasPage(currentPage, STUDENT_EXAMS_PAGE_SIZE) || loading) return;

		loading = true;

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

				loading = false;

			});

	});



	const paginationWindow = 2;

	const startPage = $derived(Math.max(1, currentPage - paginationWindow));

	const endPage = $derived(Math.min(lastPage, currentPage + paginationWindow));

	const visiblePages = $derived(

		Array.from({ length: Math.max(0, endPage - startPage + 1) }, (_, i) => startPage + i)

	);



	function buildPageLink(page: number) {

		return page <= 1 ? '/student/exams' : `/student/exams?page=${page}`;

	}

</script>



<svelte:head>

	<title>All Exams</title>

</svelte:head>



{#if loading || (!hasCurrentPage && !error)}

	<div class="flex min-h-screen items-center justify-center text-[var(--page-text-muted)]">Loading...</div>

{:else if error}

	<div class="flex min-h-screen items-center justify-center text-semantic-error">{error}</div>

{:else}

	<Exam exams={displayExams} boardName="All" />



	{#if lastPage > 1}

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



				{#if currentPage < lastPage}

					<a class="pagination-btn" href={buildPageLink(currentPage + 1)}>Next</a>

					<a class="pagination-btn" href={buildPageLink(lastPage)}>Last →</a>

				{/if}

			</div>

		</div>

	{/if}

{/if}

