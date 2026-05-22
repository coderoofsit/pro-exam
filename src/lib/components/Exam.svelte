<script lang="ts">
	import type { Exam as ExamApi } from '$lib/api/exams';
	import ExamBoxCard from '$lib/components/ExamBoxCard.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { goto } from '$app/navigation';
	import { examSlugHref } from '$lib/exams/examPortalPaths';

let {
	exams,
	boardName,
	pyq = false,
	hideBoardTitle = false,
	basePath,
	showBackButton = true,
	hideCount = false,
	compact = false,
	pageClass = ''
}: {
	exams: ExamApi[];
	boardName: string;
	pyq?: boolean;
	hideBoardTitle?: boolean;
	basePath?: string;
	showBackButton?: boolean;
	hideCount?: boolean;
	compact?: boolean;
	pageClass?: string;
} = $props();

	function getExamSlug(exam: any): string {
		return exam?.slug ?? exam?._id ?? '';
	}

	function getExamHref(exam: any): string {
		const slug = getExamSlug(exam);
		const examsBase = basePath ?? '/exams';
		return examSlugHref(examsBase, slug, { pyq });
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

	const isStudentExamsPage = $derived(basePath === '/student/exams' || pageClass === 'student-exams');
	const metaSpacing = $derived(
		compact && !showBackButton ? 'mt-0 mb-1.5 sm:mb-2' : 'mt-3 mb-3'
	);
</script>

<div class="mx-auto w-full max-w-7xl min-w-0 text-[var(--page-text)] {compact ? '' : 'p-4'} {isStudentExamsPage ? 'exam-page--student' : ''}">
	{#if showBackButton || !hideCount}
	<div class="{showBackButton || !hideCount ? metaSpacing : ''} flex items-center gap-3 exam-page__meta">
		{#if showBackButton}
			<BackButton
				label="Back"
				onClick={() => void goto(backFallbackForBasePath(), { replaceState: true })}
			/>
		{/if}
		{#if !hideCount}
		<p class="text-sm text-[var(--page-text-muted)] exam-page__count">
			{exams.length} exam{exams.length !== 1 ? 's' : ''} available
		</p>
		{/if}
	</div>
	{/if}

	{#if !hideBoardTitle}
		<h1 class="mb-6 mt-1 text-xl font-bold text-[var(--page-text)] md:text-2xl">{boardName} Exams</h1>
	{/if}

	{#if exams.length === 0}
		<p class="text-[var(--page-text-muted)]">No exams found for this board.</p>
	{:else}
		<div class="exam-card-responsive-grid min-w-0 exam-page__grid">
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
