<script lang="ts">
	import type { PageSkeletonVariant } from '$lib/skeletons/routeVariant';
	import StudentDashboardSkeleton from '$lib/components/skeletons/StudentDashboardSkeleton.svelte';
	import PortalDashboardSkeleton from '$lib/components/skeletons/PortalDashboardSkeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
	import ExamSubjectsSkeleton from '$lib/components/skeletons/ExamSubjectsSkeleton.svelte';
	import ExamChaptersSkeleton from '$lib/components/skeletons/ExamChaptersSkeleton.svelte';
	import ExamQuestionsPageSkeleton from '$lib/components/skeletons/ExamQuestionsPageSkeleton.svelte';
	import ExamQuestionDetailSkeleton from '$lib/components/skeletons/ExamQuestionDetailSkeleton.svelte';
	import TestsListSkeleton from '$lib/components/skeletons/TestsListSkeleton.svelte';
	import BatchCardsSkeleton from '$lib/components/skeletons/BatchCardsSkeleton.svelte';
	import StudentBatchDetailSkeleton from '$lib/components/skeletons/StudentBatchDetailSkeleton.svelte';
	import BatchDetailSkeleton from '$lib/components/skeletons/BatchDetailSkeleton.svelte';
	import SubscriptionPageSkeleton from '$lib/components/skeletons/SubscriptionPageSkeleton.svelte';
	import ManagementTableSkeleton from '$lib/components/ManagementTableSkeleton.svelte';
	import SettingsPageSkeleton from '$lib/components/skeletons/SettingsPageSkeleton.svelte';
	import OwnTestSyllabusSkeleton from '$lib/components/OwnTestSyllabusSkeleton.svelte';
	import QuestionListSkeleton from '$lib/components/skeletons/QuestionListSkeleton.svelte';
	import PyqExamPapersSkeleton from '$lib/components/skeletons/PyqExamPapersSkeleton.svelte';
	import GeneralPageSkeleton from '$lib/components/skeletons/GeneralPageSkeleton.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { variant }: { variant: PageSkeletonVariant } = $props();
</script>

<div class="page-route-skeleton min-h-[50vh]" aria-busy="true" aria-label="Loading page">
	{#if variant === 'student-dashboard'}
		<StudentDashboardSkeleton />
	{:else if variant === 'portal-dashboard'}
		<PortalDashboardSkeleton />
	{:else if variant === 'exam-subjects'}
		<div class="mx-auto w-full px-4 md:px-6 py-1">
			<ExamSubjectsSkeleton />
		</div>
	{:else if variant === 'exam-chapters'}
		<ExamChaptersSkeleton />
	{:else if variant === 'exam-questions'}
		<ExamQuestionsPageSkeleton />
	{:else if variant === 'exam-question-detail'}
		<div class="mx-auto max-w-6xl px-2 sm:px-4 md:px-6 py-3 h-full min-h-[50vh]">
			<ExamQuestionDetailSkeleton />
		</div>
	{:else if variant === 'exam-grid'}
		<div class="mx-auto max-w-7xl px-4 py-6">
			<Skeleton width="w-32" height="h-8" className="mb-6" strong />
			<ExamGridSkeleton count={12} tileClass="skel-card" cardMinHeight="min-h-[128px]" />
		</div>
	{:else if variant === 'tests-list'}
		<TestsListSkeleton />
	{:else if variant === 'batch-cards'}
		<div class="mx-auto max-w-7xl px-4 py-6">
			<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
				<Skeleton width="w-40" height="h-8" strong />
				<Skeleton width="w-32" height="h-10" rounded="rounded-xl" />
			</div>
			<BatchCardsSkeleton />
		</div>
	{:else if variant === 'student-batch-detail'}
		<StudentBatchDetailSkeleton />
	{:else if variant === 'batch-detail'}
		<BatchDetailSkeleton />
	{:else if variant === 'subscription'}
		<SubscriptionPageSkeleton />
	{:else if variant === 'management-table'}
		<div class="mx-auto max-w-7xl space-y-4 px-4 py-4">
			<Skeleton width="w-48" height="h-8" strong />
			<ManagementTableSkeleton rowCount={8} />
		</div>
	{:else if variant === 'settings'}
		<SettingsPageSkeleton />
	{:else if variant === 'own-test-syllabus'}
		<div class="mx-auto max-w-7xl px-4 py-4">
			<OwnTestSyllabusSkeleton />
		</div>
	{:else if variant === 'question-list'}
		<div class="own-test-page mx-auto max-w-6xl px-4 py-4 sm:px-6">
			<QuestionListSkeleton />
		</div>
	{:else if variant === 'pyq-exam-papers'}
		<PyqExamPapersSkeleton />
	{:else if variant === 'generic-page'}
		<GeneralPageSkeleton />
	{/if}
</div>
