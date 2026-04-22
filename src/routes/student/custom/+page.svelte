<script lang="ts">
	import OwnTestChaptersPanel from '$lib/components/OwnTestChaptersPanel.svelte';
	import type { GroupedSubjectRow } from '$lib/api/chapters';
	import BackButton from '$lib/components/BackButton.svelte';

	let { data } = $props<{
		data: {
			examSlug: string;
			groupedSubjects: GroupedSubjectRow[];
			message: string | null;
		};
	}>();

	function examTitleFromSlug(slug: string) {
		return slug
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>Custom Exam {data.examSlug}</title>
</svelte:head>

<div class="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<BackButton href="/student/exams" label="Back to Exams" className="mb-6" />

		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">{examTitleFromSlug(data.examSlug)}</h1>
			<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject, then open units/chapters</p>
		</div>

		{#if data.message}
			<p class="text-semantic-error-soft">{data.message}</p>
		{:else}
			<OwnTestChaptersPanel groupedSubjects={data.groupedSubjects} examSlug={data.examSlug} />
		{/if}
	</div>
</div>

