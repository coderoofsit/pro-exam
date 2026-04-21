<script lang="ts">
	import type { Exam as ExamApi } from '$lib/api/exams';
	import ExamPaper from '$lib/components/ExamPaper.svelte';

let {
	exams,
	boardName,
	pyq = false,
	hideBoardTitle = false
}: { exams: ExamApi[]; boardName: string; pyq?: boolean; hideBoardTitle?: boolean } = $props();

	function getExamSlug(exam: any): string {
		return exam?.slug ?? exam?._id ?? '';
	}

	function getExamHref(exam: any): string {
		const slug = getExamSlug(exam);
		return pyq ? `/student-exam/${slug}?pyq=true` : `/student-exam/${slug}`;
	}

	function getExamNameEn(exam: any): string {
		const n = exam?.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object') return typeof n.en === 'string' ? n.en : '';
		return '';
	}
</script>

<div class="mx-auto w-full max-w-6xl min-w-0 text-[var(--page-text)]">
	<div class="mt-3 mb-3 flex items-center gap-3">
		<a
			href="/student/dashboard"
			class="inline-flex items-center rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--page-card-bg)] px-3 py-1.5 text-sm text-[var(--page-text-muted)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--accent-cta-pink)] hover:text-[var(--accent-cta-pink)]"
		>
			← Back
		</a>
		<p class="text-sm text-[var(--page-text-muted)]">
			{exams.length} exam{exams.length !== 1 ? 's' : ''} available
		</p>
	</div>

	{#if !hideBoardTitle}
		<h1 class="mb-6 mt-1 text-xl font-bold text-[var(--page-text)] md:text-2xl">{boardName} Exams</h1>
	{/if}

	{#if exams.length === 0}
		<p class="text-[var(--page-text-muted)]">No exams found for this board.</p>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
			{#each exams as exam (exam._id)}
				<ExamPaper
					id={exam._id}
					name={getExamNameEn(exam)}
					image={exam.image ?? null}
					slug={getExamSlug(exam)}
					href={getExamHref(exam)}
				/>
			{/each}
		</div>
	{/if}
</div>
