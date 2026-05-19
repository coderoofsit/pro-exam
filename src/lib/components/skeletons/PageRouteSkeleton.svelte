<script lang="ts">
	import { getPageSkeletonVariant } from '$lib/skeletons/routeVariant';
	import DashboardPageSkeleton from '$lib/components/skeletons/DashboardPageSkeleton.svelte';
	import ExamGridSkeleton from '$lib/components/skeletons/ExamGridSkeleton.svelte';
	import TestsListSkeleton from '$lib/components/skeletons/TestsListSkeleton.svelte';
	import BatchCardsSkeleton from '$lib/components/skeletons/BatchCardsSkeleton.svelte';
	import BatchDetailSkeleton from '$lib/components/skeletons/BatchDetailSkeleton.svelte';
	import SubscriptionPageSkeleton from '$lib/components/skeletons/SubscriptionPageSkeleton.svelte';
	import ManagementTableSkeleton from '$lib/components/ManagementTableSkeleton.svelte';
	import SettingsPageSkeleton from '$lib/components/skeletons/SettingsPageSkeleton.svelte';
	import OwnTestSyllabusSkeleton from '$lib/components/OwnTestSyllabusSkeleton.svelte';
	import QuestionListSkeleton from '$lib/components/skeletons/QuestionListSkeleton.svelte';
	import DefaultPageSkeleton from '$lib/components/skeletons/DefaultPageSkeleton.svelte';

	let { pathname = '/' }: { pathname?: string } = $props();

	const variant = $derived(getPageSkeletonVariant(pathname));
</script>

<div class="page-route-skeleton min-h-[50vh]" aria-busy="true" aria-label="Loading page">
	{#if variant === 'dashboard'}
		<DashboardPageSkeleton />
	{:else if variant === 'exam-grid'}
		<div class="mx-auto max-w-7xl px-4 py-6">
			<ExamGridSkeleton />
		</div>
	{:else if variant === 'tests-list'}
		<TestsListSkeleton />
	{:else if variant === 'batch-cards'}
		<div class="mx-auto max-w-7xl px-4 py-6">
			<BatchCardsSkeleton />
		</div>
	{:else if variant === 'batch-detail'}
		<BatchDetailSkeleton />
	{:else if variant === 'subscription'}
		<SubscriptionPageSkeleton />
	{:else if variant === 'management-table'}
		<div class="mx-auto max-w-7xl px-4 py-4">
			<ManagementTableSkeleton rowCount={8} />
		</div>
	{:else if variant === 'settings'}
		<SettingsPageSkeleton />
	{:else if variant === 'own-test-syllabus'}
		<div class="mx-auto max-w-7xl px-4 py-4">
			<OwnTestSyllabusSkeleton />
		</div>
	{:else if variant === 'question-list'}
		<div class="mx-auto max-w-5xl px-4 py-4">
			<QuestionListSkeleton />
		</div>
	{:else}
		<DefaultPageSkeleton />
	{/if}
</div>
