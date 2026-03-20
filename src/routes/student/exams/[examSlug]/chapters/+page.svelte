<script lang="ts">
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth';
	import { chapterStore } from '$lib/stores/chapter';
	import { examStore } from '$lib/stores/exam';
	import { fetchExamBySlug } from '$lib/api/exams';
	import { fetchChaptersByBoardAndExam } from '$lib/api/chapters';

	const examSlug = $derived($page.params.examSlug);
	const _chapterStore = $derived($chapterStore);
	const _examStore = $derived($examStore);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let exam = $state<{ name?: { en?: string }; boardSlug: string; slug: string } | null>(null);

	const token = $derived($authStore.token?.startsWith('Bearer ') ? $authStore.token.slice(7) : $authStore.token);

	const displayChapters = $derived(
		exam ? (chapterStore.getChapters(exam.boardSlug, examSlug) ?? []) : []
	);

	$effect(() => {
		if (!examSlug) return;
		const examFromStore = examStore.getExamBySlug(examSlug);
		const boardSlug = examFromStore?.boardSlug ?? exam?.boardSlug;
		if (boardSlug && chapterStore.hasChapters(boardSlug, examSlug)) {
			exam = examFromStore ?? exam;
			return;
		}
		if (loading) return;
		loading = true;
		error = null;
		(async () => {
			try {
				const e = examFromStore ?? (await fetchExamBySlug(examSlug, token ?? undefined));
				exam = e;
				if (chapterStore.hasChapters(e.boardSlug, e.slug)) return;
				const ch = await fetchChaptersByBoardAndExam(e.boardSlug, e.slug, token ?? undefined);
				chapterStore.setChapters(e.boardSlug, e.slug, ch);
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to fetch chapters';
			} finally {
				loading = false;
			}
		})();
	});
</script>

<svelte:head>
	<title>{exam?.name?.en ?? examSlug} Chapters</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<a href="/student/exams" class="mb-6 inline-block text-sm text-slate-400 hover:text-white">← Back to Exams</a>
		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">{exam?.name?.en ?? examSlug} Chapters</h1>
			<p class="mt-2 text-base text-slate-300">{displayChapters.length} chapter{displayChapters.length !== 1 ? 's' : ''} available</p>
		</div>

		{#if loading}
			<div class="flex min-h-[200px] items-center justify-center text-slate-400">Loading...</div>
		{:else if error}
			<p class="text-red-400">{error}</p>
		{:else if displayChapters.length === 0}
			<p class="text-slate-500">No chapters found for this exam.</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each displayChapters as chapter}
					<a
						class="block cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800"
						href={`/student/exams/${examSlug}/${chapter.slug ?? chapter._id}`}
					>
						<div class="mb-4 flex items-start justify-between gap-3">
							<span class="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
								Order: {chapter.order}
							</span>
							<span class="break-all text-right text-[11px] text-slate-400">{chapter._id}</span>
						</div>
						<h2 class="text-xl font-semibold leading-7">{chapter.name.en}</h2>
						{#if chapter.name.hi}
							<p class="mt-2 text-sm text-slate-300">{chapter.name.hi}</p>
						{:else}
							<p class="mt-2 text-sm text-slate-500">Hindi name not available</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
