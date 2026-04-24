<script lang="ts">
	import { browser } from '$app/environment';
	import { chapterQuestionsPath } from '$lib/chapterRoutes';
	import type { Chapter, ChaptersHierarchyResponse } from '$lib/api/chapters';
	import { chapterStore } from '$lib/stores/chapter';
	import BackButton from '$lib/components/BackButton.svelte';

	let { data } = $props<{
		data: {
			examSlug: string;
			subjectSlug: string;
			exam: any | null;
			hierarchy: ChaptersHierarchyResponse | null;
			chapterGroupsChapters: Record<string, Chapter[]>;
			message: string | null;
		};
	}>();

	const examSlug = $derived(data.examSlug);
	const subjectSlug = $derived(data.subjectSlug);

	function getExamTitleEn(exam: any, fallback: string) {
		const n = exam?.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object' && typeof n.en === 'string') return n.en;
		return fallback;
	}

	const subject = $derived.by(() => {
		return data.hierarchy?.subjects?.find((s: any) => s.slug === subjectSlug) ?? null;
	});

	type ChapterWithGroup = {
		chapter: Chapter;
		groupName: string;
		groupOrder: number;
	};

	const allChapters = $derived.by((): ChapterWithGroup[] => {
		const subj = subject;
		if (!subj) return [];

		const out: ChapterWithGroup[] = [];
		for (const cg of subj.chapterGroups ?? []) {
			const chapters = data.chapterGroupsChapters[cg._id] ?? [];
			for (const ch of chapters) {
				out.push({
					chapter: ch,
					groupName: cg.name?.en ?? cg.slug ?? '',
					groupOrder: cg.order ?? 0
				});
			}
		}

		return out.sort((a, b) => {
			if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
			return a.chapter.order - b.chapter.order;
		});
	});

	// Seed stores from SSR data so later navigation can reuse cached hierarchy/chapter lists.
	$effect(() => {
		if (!browser) return;
		if (!data?.exam?.boardSlug || !data?.exam?.slug) return;
		if (!data?.hierarchy) return;

		const boardSlug = data.exam.boardSlug as string;
		const examSlugForKey = data.exam.slug as string;

		if (!chapterStore.hasHierarchy(boardSlug, examSlugForKey)) {
			chapterStore.setHierarchy(boardSlug, examSlugForKey, data.hierarchy);
		}

		for (const [chapterGroupId, chapters] of Object.entries(data.chapterGroupsChapters ?? {})) {
			if (!chapterGroupId) continue;
			if (chapterStore.hasChaptersForChapterGroup(chapterGroupId)) continue;
			if (Array.isArray(chapters) && chapters.length) {
				chapterStore.setChaptersByChapterGroupId(chapterGroupId, chapters);
			}
		}
	});
</script>

<svelte:head>
	<title>{subject?.name?.en ?? subjectSlug} — {data.exam ? getExamTitleEn(data.exam, examSlug) : examSlug}</title>
</svelte:head>

<div class="flex min-h-0 items-start bg-[var(--page-bg)] text-[var(--page-text)]">
	<aside
		class="sticky top-0 z-[1] flex max-h-[calc(100dvh-7rem)] w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-4"
	>
		<BackButton label="Back" className="mb-4" />
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--page-text-muted)]">Subjects</h2>
		{#if data.hierarchy?.subjects}
			<nav class="space-y-0.5">
				{#each data.hierarchy.subjects as s (s._id)}
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
									{#if data.chapterGroupsChapters[cg._id]?.length}
										{#each data.chapterGroupsChapters[cg._id] as ch (ch._id)}
											<a
												href={chapterQuestionsPath(examSlug, subjectSlug, ch)}
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

			{#if data.message}
				<p class="text-semantic-error-soft">{data.message}</p>
			{:else if !subject}
				<p class="text-[var(--page-text-muted)]">Subject not found.</p>
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
