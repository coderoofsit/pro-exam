<script lang="ts">
	import { page } from '$app/stores';
	import { chapterStore } from '$lib/stores/chapter';
	import { examStore } from '$lib/stores/exam';
	import { fetchChaptersByChapterGroupId, fetchChaptersHierarchy } from '$lib/api/chapters';
	import { fetchExamBySlug } from '$lib/api/exams';
	import { chapterQuestionsPath } from '$lib/chapterRoutes';
	import type { Chapter } from '$lib/api/chapters';

	const examSlug = $derived($page.params.examSlug);
	const subjectSlug = $derived($page.params.subjectSlug);

	let loading = $state(false);
	let exam = $state<{ boardSlug: string; slug: string; name?: { en?: string } } | null>(null);
	let chaptersLoading = $state(false);
	let error = $state<string | null>(null);

	const chapterStoreState = $derived($chapterStore);

	const hierarchy = $derived.by(() => {
		if (!exam || !chapterStoreState) return null;
		return chapterStoreState.hierarchyByKey[`${exam.boardSlug}:${exam.slug}`];
	});

	const subject = $derived.by(() => {
		const h = hierarchy;
		if (!h?.subjects) return null;
		return h.subjects.find((s) => s.slug === subjectSlug) ?? null;
	});

	type ChapterWithGroup = {
		chapter: Chapter;
		groupName: string;
		groupOrder: number;
	};
	const allChapters = $derived.by(() => {
		const subj = subject;
		const cs = chapterStoreState;
		if (!subj?.chapterGroups || !cs) return [];
		const out: ChapterWithGroup[] = [];
		for (const cg of subj.chapterGroups) {
			const chapters = cs.chaptersByChapterGroupId[cg._id];
			if (chapters) {
				for (const ch of chapters) {
					out.push({
						chapter: ch,
						groupName: cg.name?.en ?? cg.slug ?? '',
						groupOrder: cg.order ?? 0
					});
				}
			}
		}
		return out.sort((a, b) => {
			if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
			return a.chapter.order - b.chapter.order;
		});
	});

	$effect(() => {
		if (!examSlug || !subjectSlug) return;
		const exFromStore = examStore.getExamBySlug(examSlug);
		if (exFromStore) exam = exFromStore;
		const ex = exFromStore ?? exam;
		if (!ex) {
			loading = true;
			error = null;
			fetchExamBySlug(examSlug)
				.then((e) => {
					exam = e;
					if (!chapterStore.hasHierarchy(e.boardSlug, e.slug)) {
						return fetchChaptersHierarchy(e.boardSlug, e.slug);
					}
				})
				.then((h) => {
					if (h && exam) chapterStore.setHierarchy(exam.boardSlug, exam.slug, h);
				})
				.catch((e) => (error = e instanceof Error ? e.message : 'Failed to load'))
				.finally(() => (loading = false));
			return;
		}
		exam = ex;
		if (chapterStore.hasHierarchy(ex.boardSlug, ex.slug)) return;
		if (loading) return;
		loading = true;
		error = null;
		fetchChaptersHierarchy(ex.boardSlug, ex.slug)
			.then((h) => chapterStore.setHierarchy(ex.boardSlug, ex.slug, h))
			.catch((e) => (error = e instanceof Error ? e.message : 'Failed to load'))
			.finally(() => (loading = false));
	});

	$effect(() => {
		const subj = subject;
		if (!subj?.chapterGroups?.length) return;
		if (chaptersLoading) return;
		const missing = subj.chapterGroups.filter((cg) => !chapterStore.hasChaptersForChapterGroup(cg._id));
		if (missing.length === 0) return;
		chaptersLoading = true;
		Promise.all(missing.map((cg) => fetchChaptersByChapterGroupId(cg._id)))
			.then((results) => {
				missing.forEach((cg, i) => {
					const res = results[i];
					const chapters = Array.isArray(res) ? res : (res as { data: Chapter[] }).data;
					chapterStore.setChaptersByChapterGroupId(cg._id, chapters);
				});
			})
			.catch(() => {})
			.finally(() => (chaptersLoading = false));
	});
</script>

<svelte:head>
	<title>{subject?.name?.en ?? subjectSlug} — {exam?.name?.en ?? examSlug}</title>
</svelte:head>

<div class="flex min-h-0 items-start bg-[var(--page-bg)] text-[var(--page-text)]">
	<aside
		class="sticky top-0 z-[1] flex max-h-[calc(100dvh-7rem)] w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-4"
	>
		<a
			href="/student/exams/{examSlug}/subject"
			class="mb-4 flex items-center gap-2 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
				<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Back to subjects
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
						{#if subject?.chapterGroups}
							<div class="mt-2 pl-3">
								{#each subject.chapterGroups as cg (cg._id)}
									<div class="mb-2 text-xs font-medium text-[var(--page-text-muted)]">{cg.name?.en ?? cg.slug}</div>
									{#if chapterStoreState?.chaptersByChapterGroupId[cg._id]}
										{#each chapterStoreState.chaptersByChapterGroupId[cg._id] as ch (ch._id)}
											<a
												href={chapterQuestionsPath(examSlug ?? '', subjectSlug ?? '', ch)}
												class="mb-1 block truncate rounded px-2 py-1 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
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

	<main class="min-w-0 flex-1 p-6">
		<div class="mx-auto max-w-5xl">
			<h1 class="mb-2 text-2xl font-bold text-[var(--page-text)]">{subject?.name?.en ?? subjectSlug}</h1>
			<p class="mb-6 text-sm text-[var(--page-text-muted)]">Select a chapter to view questions</p>

			{#if loading}
				<div class="flex min-h-[200px] items-center justify-center text-[var(--page-text-muted)]">Loading...</div>
			{:else if error}
				<p class="text-semantic-error-soft">{error}</p>
			{:else if !subject}
				<p class="text-[var(--page-text-muted)]">Subject not found.</p>
			{:else if chaptersLoading}
				<div class="flex min-h-[120px] items-center justify-center text-[var(--page-text-muted)]">
					Loading chapters...
				</div>
			{:else if allChapters.length === 0}
				<p class="text-[var(--page-text-muted)]">No chapters found for this subject.</p>
			{:else}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each allChapters as { chapter, groupName } (chapter._id)}
						<a
							href={chapterQuestionsPath(examSlug ?? '', subjectSlug ?? '', chapter)}
							class="group flex flex-col rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-5 text-left text-[var(--page-card-heading)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md"
						>
							<h2 class="text-base font-semibold leading-snug">{groupName} — {chapter.order}. {chapter.name?.en ?? chapter.slug}</h2>
							<p class="mt-2 text-sm text-[var(--page-card-sub)]">View questions →</p>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>
