<script lang="ts">
	import type { Exam as ExamApi } from '$lib/api/exams';
	import ExamBoxCard from '$lib/components/ExamBoxCard.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { goto } from '$app/navigation';

let {
	exams,
	boardName,
	pyq = false,
	hideBoardTitle = false,
	basePath,
	showBackButton = true
}: {
	exams: ExamApi[];
	boardName: string;
	pyq?: boolean;
	hideBoardTitle?: boolean;
	basePath?: string;
	showBackButton?: boolean;
} = $props();

	function getExamSlug(exam: any): string {
		return exam?.slug ?? exam?._id ?? '';
	}

	function getExamHref(exam: any): string {
		const slug = getExamSlug(exam);
		if (basePath) {
			const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
			return `${normalizedBasePath}/${encodeURIComponent(slug)}`;
		}
		return pyq ? `/student-exam/${slug}?pyq=true` : `/student-exam/${slug}`;
	}

	function getExamNameEn(exam: any): string {
		const n = exam?.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object') return typeof n.en === 'string' ? n.en : '';
		return '';
	}

	function backFallbackForBasePath() {
		if (basePath === '/student/exams') return '/student/dashboard';
		if (basePath === '/teacher/exams') return '/teacher/dashboard';
		if (basePath === '/institute/exams') return '/institute/dashboard';
		return '/';
	}
</script>

<div class="mx-auto p-4 w-full max-w-7xl min-w-0 text-[var(--page-text)]">
	<div class="mt-3 mb-3 flex items-center gap-3">
		{#if showBackButton}
			<BackButton
				label="Back"
				onClick={() => void goto(backFallbackForBasePath(), { replaceState: true })}
			/>
		{/if}
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
				<ExamBoxCard
					id={exam._id}
					name={getExamNameEn(exam)}
					image={exam.image ?? null}
					variant="dashboard"
					href={getExamHref(exam)}
				/>
			{/each}
		</div>
	{/if}
</div>
