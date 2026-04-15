<script lang="ts">
	import type { Exam as ExamApi } from '$lib/api/exams';
	import ExamPaper from '$lib/components/ExamPaper.svelte';

	let { exams, boardName, pyq = false }: { exams: ExamApi[]; boardName: string; pyq?: boolean } = $props();

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

<div class="mx-auto w-full max-w-6xl min-w-0 text-[var(--page-text)] ml-0">
	<a
		href="/student/dashboard"
		class="mb-5 inline-block text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
	>
		← Back to Dashboard
	</a>

	<div class="mb-6">
		<h1 class="break-words text-2xl font-bold text-[var(--page-text)] md:text-3xl">{boardName} Exams</h1>
		<p class="mt-1 break-words text-sm text-[var(--page-text-muted)]">
			{exams.length} exam{exams.length !== 1 ? 's' : ''} available
		</p>
	</div>

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
