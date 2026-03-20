<script lang="ts">
	import { page } from '$app/stores';
	import Exam from '$lib/components/Exam.svelte';
	import { examStore } from '$lib/stores/exam';
	import { authStore } from '$lib/stores/auth';
	import { fetchExamsPage } from '$lib/api/exams';

	const currentPage = $derived(Math.max(1, Number($page.url.searchParams.get('page')) || 1));

	let loading = $state(false);
	let error = $state<string | null>(null);

	const token = $derived(
		$authStore.token?.startsWith('Bearer ') ? $authStore.token.slice(7) : $authStore.token
	);

	const displayExams = $derived($examStore.examsByPage[currentPage] ?? []);
	const { total, lastPage, limit } = $derived($examStore);
	const hasCurrentPage = $derived(currentPage in $examStore.examsByPage);

	$effect(() => {
		if (examStore.hasPage(currentPage) || loading) return;
		loading = true;
		error = null;
		fetchExamsPage(currentPage, 8, token ?? undefined)
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
	const startPage = Math.max(1, currentPage - paginationWindow);
	const endPage = Math.min(lastPage, currentPage + paginationWindow);
	const visiblePages = Array.from(
		{ length: Math.max(0, endPage - startPage + 1) },
		(_, i) => startPage + i
	);

	function buildPageLink(page: number) {
		return page <= 1 ? '/student/exams' : `/student/exams?page=${page}`;
	}
</script>

<svelte:head>
	<title>All Exams</title>
</svelte:head>

{#if loading || (!hasCurrentPage && !error)}
	<div class="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center text-red-400">{error}</div>
{:else}
	<Exam exams={displayExams} boardName="All" />

	{#if lastPage > 1}
		<div class="mx-auto max-w-7xl px-4 pb-10">
			<div class="mt-8 flex flex-wrap items-center justify-center gap-1.5">
				{#if currentPage > 1}
					<a
						class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
						href={buildPageLink(1)}
					>
						← First
					</a>
					<a
						class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
						href={buildPageLink(currentPage - 1)}
					>
						Prev
					</a>
				{/if}

				{#each visiblePages as pageNum}
					<a
						class="rounded-lg border px-3.5 py-2 text-xs transition-all {pageNum === currentPage
							? 'bg-indigo-600 border-transparent text-white'
							: 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
						href={buildPageLink(pageNum)}
					>
						{pageNum}
					</a>
				{/each}

				{#if currentPage < lastPage}
					<a
						class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
						href={buildPageLink(currentPage + 1)}
					>
						Next
					</a>
					<a
						class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
						href={buildPageLink(lastPage)}
					>
						Last →
					</a>
				{/if}
			</div>
		</div>
	{/if}
{/if}
