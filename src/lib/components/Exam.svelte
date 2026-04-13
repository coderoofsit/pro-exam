<script lang="ts">
	import type { Exam as ExamApi } from '$lib/api/exams';

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

	function getExamNameHi(exam: any): string | null {
		const n = exam?.name;
		if (n && typeof n === 'object' && typeof n.hi === 'string') return n.hi;
		return null;
	}
</script>

<div class="mx-auto w-full max-w-6xl min-w-0 text-[var(--page-text)]">
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
		<div
			class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
		>
			{#each exams as exam (exam._id)}
				<a
					href={getExamHref(exam)}
					class="group flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-link)]"
				>
					{#if exam.image}
						<img
							src={exam.image}
							alt=""
							class="h-9 w-9 shrink-0 rounded-full border border-[var(--page-card-border)] object-cover ring-1 ring-[var(--page-card-border)]"
						/>
					{:else}
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--page-card-border)] bg-[var(--page-avatar-bg)] text-xs font-bold text-[var(--page-avatar-text)] ring-1 ring-[var(--page-card-border)]"
						>
							{getExamNameEn(exam)[0]?.toUpperCase() ?? '?'}
						</div>
					{/if}
					<span
						class="line-clamp-2 w-full text-[13px] font-semibold leading-tight text-[var(--page-card-heading)] group-hover:text-[var(--page-link)]"
					>
						{getExamNameEn(exam)}
					</span>
					{#if getExamNameHi(exam)}
						<span class="line-clamp-1 w-full text-[11px] leading-tight text-[var(--page-card-sub)]">
							{getExamNameHi(exam)}
						</span>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>
