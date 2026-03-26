<script lang="ts">
	import OwnTestChaptersPanel from '$lib/components/OwnTestChaptersPanel.svelte';
	import type { GroupedSubjectRow } from '$lib/api/chapters';

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

{#if data.message}
	<div class="flex min-h-screen items-center justify-center text-semantic-error">{data.message}</div>
{:else}
	<div class="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]">
		<div class="mx-auto max-w-7xl px-4 py-10">
			<a
				href="/student/exams"
				class="mb-6 inline-block text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
			>
				← Back to Exams
			</a>

			<div class="mb-8">
				<h1 class="text-3xl font-bold md:text-4xl">{examTitleFromSlug(data.examSlug)}</h1>
				<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject, then open units/chapters</p>
			</div>

			<OwnTestChaptersPanel groupedSubjects={data.groupedSubjects} examSlug={data.examSlug} />
		</div>
	</div>
{/if}

