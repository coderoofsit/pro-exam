<script lang="ts">
	import { browser } from '$app/environment';
	// Chapter cards now route to `/student-exam/[examSlug]/[chapterParam]`

	type SubjectNavRow = {
		_id: string;
		slug: string;
		name?: { en: string; hi?: string };
		unitCount: number;
	};

	type ChapterLite = { _id: string; slug?: string; order?: number; name?: { en: string; hi?: string } };
	type ChapterCardRow = {
		chapter: ChapterLite;
		groupName: string;
		groupOrder: number;
	};

	let { data } = $props<{
		data: {
			examSlug: string;
			exam: any | null;
			hierarchy: null;
			subjects: SubjectNavRow[];
			chaptersBySubjectSlug: Record<string, ChapterCardRow[]>;
			initialSubjectSlug: string;
			message: string | null;
		};
	}>();

	function getExamTitleEn(exam: any, fallback: string) {
		const n = exam?.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object' && typeof n.en === 'string') return n.en;
		return fallback;
	}

	let selectedSubjectSlug = $state('');
	let showChapters = $state(false);
	let hasRestoredState = $state(false);

	$effect(() => {
		if (browser && !hasRestoredState) {
			const referrer = document.referrer;
			const isFromChapterPage = referrer.includes(`/student-exam/${data.examSlug}/`) && !referrer.endsWith(`/student-exam/${data.examSlug}`);
			const isFromExamsOrDashboard = referrer.includes('/student/exams') || referrer.includes('/student/dashboard');
			
			if (isFromExamsOrDashboard) {
				sessionStorage.removeItem(`exam-${data.examSlug}-subject`);
			} else if (isFromChapterPage) {
				const stored = sessionStorage.getItem(`exam-${data.examSlug}-subject`);
				if (stored && data.subjects.find(s => s.slug === stored)) {
					selectedSubjectSlug = stored;
					showChapters = true;
				}
			}
			hasRestoredState = true;
		}
	});

	const selectedSubject = $derived.by(() => {
		return data.subjects?.find((s: SubjectNavRow) => s.slug === selectedSubjectSlug) ?? null;
	});

	const displayChapters = $derived.by((): ChapterCardRow[] => {
		if (!selectedSubjectSlug) return [];
		return data.chaptersBySubjectSlug?.[selectedSubjectSlug] ?? [];
	});

	function selectSubject(slug: string) {
		selectedSubjectSlug = slug;
		showChapters = true;
		if (browser) {
			sessionStorage.setItem(`exam-${data.examSlug}-subject`, slug);
		}
	}

	function backToSubjects() {
		showChapters = false;
		selectedSubjectSlug = '';
		if (browser) {
			sessionStorage.removeItem(`exam-${data.examSlug}-subject`);
		}
	}
</script>

<svelte:head>
	<title>Student Exam {data.examSlug}</title>
	<style>
		body {
			overflow: hidden;
		}
	</style>
</svelte:head>

{#if data.message}
	<div class="flex h-screen items-center justify-center text-semantic-error">{data.message}</div>
{:else}
	<div class="flex h-screen overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]">
		<div class="mx-auto flex h-full w-full max-w-7xl overflow-hidden px-4">
			{#if !showChapters}
				<div class="flex flex-1 flex-col py-10">
					<a
						href="/student/exams"
						class="mb-6 inline-block text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
					>
						← Back to Exams
					</a>

					<div class="mb-8">
						<h1 class="text-3xl font-bold md:text-4xl">
							{data.exam ? getExamTitleEn(data.exam, data.examSlug) : data.examSlug}
						</h1>
						<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject, then open units/chapters</p>
					</div>

					{#if data.subjects.length === 0}
						<p class="text-[var(--page-text-muted)]">No subjects found for this exam.</p>
					{:else}
						<div class="flex-1 overflow-y-auto pb-6">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each data.subjects as s (s._id)}
									<button
										type="button"
										onclick={() => selectSubject(s.slug)}
										class="group flex flex-col rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md"
									>
										<h2 class="text-base font-semibold leading-snug text-[var(--page-card-heading)]">
											{s.name?.en ?? s.slug}
										</h2>
										<p class="mt-2 text-sm text-[var(--page-card-sub)]">{s.unitCount} chapters</p>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<aside class="flex h-full w-64 shrink-0 flex-col border-r border-[var(--page-card-border)] bg-[var(--page-card-bg)]">
					<div class="flex-1 overflow-y-auto p-4">
						<a
							href="/student/exams"
							class="mb-4 flex items-center gap-2 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
								<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							Back to Exams
						</a>
						<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--page-text-muted)]">Subjects</h2>
						<nav class="space-y-1">
							{#each data.subjects as s (s._id)}
								<button
									type="button"
									onclick={() => selectSubject(s.slug)}
									class="block w-full truncate rounded px-2 py-1.5 text-left text-sm transition {s.slug === selectedSubjectSlug
										? 'border border-[var(--page-link)]/40 bg-[var(--page-link)]/10 font-medium text-[var(--page-link)]'
										: 'text-[var(--page-text-muted)] hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]'}"
								>
									{s.name?.en ?? s.slug}
								</button>
							{/each}
						</nav>
					</div>
				</aside>

				<main class="flex flex-1 flex-col">
					<div class="mx-auto flex h-full w-full max-w-4xl flex-col px-6 py-10">
						{#if selectedSubject}
							<div class="mb-6">
								<h2 class="text-2xl font-bold">{selectedSubject.name?.en ?? selectedSubject.slug}</h2>
								<p class="mt-1 text-sm text-[var(--page-text-muted)]">{displayChapters.length} chapters</p>
							</div>
						{/if}

						{#if displayChapters.length === 0}
							<p class="text-[var(--page-text-muted)]">No chapters found for this subject.</p>
						{:else}
							<div class="flex-1 overflow-y-auto pb-6">
								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
									{#each displayChapters as { chapter, groupName } (chapter._id)}
										<a
											href={`/student-exam/${data.examSlug}/${encodeURIComponent(chapter.slug ?? chapter._id)}`}
											class="group flex flex-col rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-5 text-left text-[var(--page-card-heading)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md"
										>
											<h2 class="text-base font-semibold leading-snug">
												{chapter.order}. {chapter.name?.en ?? chapter.slug}
											</h2>
											<p class="mt-1 text-xs text-[var(--page-card-sub)]">{groupName}</p>
											<p class="mt-2 text-sm text-[var(--page-card-sub)]">View questions →</p>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</main>
			{/if}
		</div>
	</div>
{/if}

