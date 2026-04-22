<script lang="ts">
	import { browser } from '$app/environment';
	import type { ChaptersHierarchyResponse } from '$lib/api/chapters';
	import { chapterStore } from '$lib/stores/chapter';
	import BackButton from '$lib/components/BackButton.svelte';

	let { data } = $props<{
		data: {
			examSlug: string;
			exam: any | null;
			hierarchy: ChaptersHierarchyResponse | null;
			message: string | null;
		};
	}>();

	function getExamTitleEn(exam: any, fallback: string) {
		const n = exam?.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object' && typeof n.en === 'string') return n.en;
		return fallback;
	}

	// Seed chapter store from SSR data (client-side only).
	$effect(() => {
		if (!browser) return;
		if (!data?.exam?.boardSlug || !data?.exam?.slug) return;
		if (!data?.hierarchy) return;

		const boardSlug = data.exam.boardSlug as string;
		const examSlugForKey = data.exam.slug as string;
		if (chapterStore.hasHierarchy(boardSlug, examSlugForKey)) return;
		chapterStore.setHierarchy(boardSlug, examSlugForKey, data.hierarchy);
	});

</script>

<svelte:head>
	<title>{data.exam ? getExamTitleEn(data.exam, data.examSlug) : data.examSlug} — Subjects</title>
</svelte:head>

<div class="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<BackButton href="/student/dashboard" label="Back to Dashboard" className="mb-6" />
		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">{data.exam ? getExamTitleEn(data.exam, data.examSlug) : data.examSlug}</h1>
			<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject, then a chapter to view questions</p>
		</div>

		{#if data.message}
			<p class="text-semantic-error-soft">{data.message}</p>
		{:else if data.hierarchy?.subjects && data.hierarchy.subjects.length === 0}
			<p class="text-[var(--page-text-muted)]">No subjects found for this exam.</p>
		{:else if data.hierarchy?.subjects}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.hierarchy.subjects as subject, i (subject._id)}
					<a
						href="/student/exams/{data.examSlug}/subject/{subject.slug}"
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
								<path
									d="M7 17L17 7M17 7H9M17 7V15"
									stroke="currentColor"
									stroke-width="1.75"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
