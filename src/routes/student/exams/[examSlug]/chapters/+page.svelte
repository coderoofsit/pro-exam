<script lang="ts">
	import { page } from '$app/stores';
	import { chapterStore } from '$lib/stores/chapter';
	import { examStore } from '$lib/stores/exam';
	import { fetchExamBySlug } from '$lib/api/exams';
	import { fetchChaptersHierarchy } from '$lib/api/chapters';

	const examSlug = $derived($page.params.examSlug);

	let loading = $state(false);
	let error = $state<string | null>(null);
	let exam = $state<{ name?: { en?: string }; boardSlug: string; slug: string } | null>(null);

	const chapterStoreState = $derived($chapterStore);
	const hierarchy = $derived.by(() => {
		if (!exam || !chapterStoreState) return null;
		return chapterStoreState.hierarchyByKey[`${exam.boardSlug}:${exam.slug}`];
	});

	$effect(() => {
		if (!examSlug) return;
		const examFromStore = examStore.getExamBySlug(examSlug);
		const boardSlug = examFromStore?.boardSlug ?? exam?.boardSlug;
		if (boardSlug && chapterStore.hasHierarchy(boardSlug, examSlug)) {
			exam = examFromStore ?? exam;
			return;
		}
		if (loading) return;
		loading = true;
		error = null;
		(async () => {
			try {
				const e = examFromStore ?? (await fetchExamBySlug(examSlug));
				exam = e;
				if (chapterStore.hasHierarchy(e.boardSlug, e.slug)) return;
				const h = await fetchChaptersHierarchy(e.boardSlug, e.slug);
				chapterStore.setHierarchy(e.boardSlug, e.slug, h);
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

<div class="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<a
			href="/student/exams"
			class="mb-6 inline-block text-sm text-[var(--page-text-muted)] hover:text-[var(--page-link-hover)]"
		>
			← Back to Exams
		</a>
		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">{exam?.name?.en ?? examSlug}</h1>
			<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject to view chapters and questions</p>
		</div>

		{#if loading}
			<div class="flex min-h-[200px] items-center justify-center text-[var(--page-text-muted)]">Loading...</div>
		{:else if error}
			<p class="text-semantic-error-soft">{error}</p>
		{:else if hierarchy?.subjects && hierarchy.subjects.length === 0}
			<p class="text-[var(--page-text-muted)]">No subjects found for this exam.</p>
		{:else if hierarchy?.subjects}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each hierarchy.subjects as subject, i (subject._id)}
					<a
						href="/student/exams/{examSlug}/subject/{subject.slug}"
						class="group flex min-h-[120px] items-start gap-4 rounded-2xl border-2 bg-[var(--page-card-bg)] p-5 text-left text-[var(--page-card-heading)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md subject-picker-card--{i % 4}"
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<h2 class="text-lg font-bold leading-tight">{subject.name?.en ?? subject.slug}</h2>
							<p class="mt-1 text-sm text-[var(--page-card-sub)]">
								{subject.chapterGroups?.length ?? 0} unit{(subject.chapterGroups?.length ?? 0) !== 1 ? 's' : ''}
							</p>
						</div>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--page-card-border)] bg-[var(--page-card-bg)] text-[var(--page-card-sub)] transition group-hover:border-[var(--page-link)] group-hover:text-[var(--page-link)]"
							aria-hidden="true"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
								<path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
