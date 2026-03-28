<script lang="ts">
	import { browser } from '$app/environment';
	import { fetchChaptersByChapterGroupId } from '$lib/api/chapters';

	type ChapterGroupMeta = {
		_id: string;
		name: { en: string; hi?: string };
		order: number;
		slug?: string;
	};

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

	const chapterLoadLocks = new Set<string>();

	let { data } = $props<{
		data: {
			examSlug: string;
			exam: Record<string, unknown> | null;
			hierarchy: null;
			subjects: SubjectNavRow[];
			chaptersBySubjectSlug: Record<string, ChapterCardRow[]>;
			chapterGroupsBySubjectSlug: Record<string, ChapterGroupMeta[]>;
			fullChaptersFromGrouped: boolean;
			initialSubjectSlug: string;
			message: string | null;
		};
	}>();

	function getExamTitleEn(exam: Record<string, unknown> | null, fallback: string) {
		if (!exam) return fallback;
		const n = exam.name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object' && typeof (n as { en?: string }).en === 'string')
			return (n as { en: string }).en;
		return fallback;
	}

	let selectedSubjectSlug = $state('');
	let showChapters = $state(false);
	let hasRestoredState = $state(false);

	let chaptersBySubjectCache = $state<Record<string, ChapterCardRow[]>>({});
	let loadedSubjectSlugs = $state<Set<string>>(new Set());
	let loadingSubjectSlug = $state<string | null>(null);
	let chaptersError = $state<string | null>(null);

	const useGroupedSsr = $derived(data.fullChaptersFromGrouped === true);

	$effect(() => {
		if (browser && !hasRestoredState) {
			const referrer = document.referrer;
			const isFromChapterPage =
				referrer.includes(`/student-exam/${data.examSlug}/`) &&
				!referrer.endsWith(`/student-exam/${data.examSlug}`);
			const isFromExamsOrDashboard =
				referrer.includes('/student/exams') || referrer.includes('/student/dashboard');

			if (isFromExamsOrDashboard) {
				sessionStorage.removeItem(`exam-${data.examSlug}-subject`);
			} else if (isFromChapterPage) {
				const stored = sessionStorage.getItem(`exam-${data.examSlug}-subject`);
				if (stored && data.subjects.find((s: SubjectNavRow) => s.slug === stored)) {
					selectedSubjectSlug = stored;
					showChapters = true;
				}
			}
			hasRestoredState = true;
		}
	});

	$effect(() => {
		if (!browser || !hasRestoredState) return;
		if (!showChapters || !selectedSubjectSlug) return;
		if (useGroupedSsr) return;
		void ensureChaptersForSubject(selectedSubjectSlug);
	});

	const selectedSubject = $derived.by(() => {
		return data.subjects?.find((s: SubjectNavRow) => s.slug === selectedSubjectSlug) ?? null;
	});

	const displayChapters = $derived.by((): ChapterCardRow[] => {
		if (!selectedSubjectSlug) return [];
		if (useGroupedSsr) {
			return data.chaptersBySubjectSlug?.[selectedSubjectSlug] ?? [];
		}
		return chaptersBySubjectCache[selectedSubjectSlug] ?? [];
	});

	const isLoadingChapters = $derived(
		!useGroupedSsr && loadingSubjectSlug !== null && loadingSubjectSlug === selectedSubjectSlug
	);

	async function ensureChaptersForSubject(slug: string) {
		if (useGroupedSsr) return;
		if (loadedSubjectSlugs.has(slug)) return;
		if (chapterLoadLocks.has(slug)) return;

		const groups = data.chapterGroupsBySubjectSlug?.[slug] ?? [];
		if (groups.length === 0) {
			chaptersBySubjectCache = { ...chaptersBySubjectCache, [slug]: [] };
			loadedSubjectSlugs = new Set([...loadedSubjectSlugs, slug]);
			return;
		}

		chapterLoadLocks.add(slug);
		loadingSubjectSlug = slug;
		chaptersError = null;
		try {
			const parts = await Promise.all(
				groups.map(async (cg: ChapterGroupMeta) => {
					const res = await fetchChaptersByChapterGroupId(cg._id);
					const chapters = Array.isArray(res) ? res : (res as { data?: ChapterLite[] }).data ?? [];
					const groupName = cg.name?.en ?? cg.slug ?? '';
					const groupOrder = cg.order ?? 0;
					return (chapters as ChapterLite[]).map((ch) => ({
						chapter: ch,
						groupName,
						groupOrder
					}));
				})
			);
			const merged = parts.flat().sort((a, b) => {
				if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
				return (a.chapter.order ?? 0) - (b.chapter.order ?? 0);
			});
			chaptersBySubjectCache = { ...chaptersBySubjectCache, [slug]: merged };
			loadedSubjectSlugs = new Set([...loadedSubjectSlugs, slug]);
		} catch (e) {
			chaptersError = e instanceof Error ? e.message : 'Failed to load chapters';
		} finally {
			chapterLoadLocks.delete(slug);
			loadingSubjectSlug = null;
		}
	}

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
										class="group flex flex-col rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)]"
									>
										<h2 class="text-lg font-semibold leading-snug text-[var(--sh-exam-card-title)]">
											{s.name?.en ?? s.slug}
										</h2>
										<p class="mt-2 text-sm text-[var(--page-text-muted)]">
											{s.unitCount}
											{useGroupedSsr ? ' chapters' : ' units'}
										</p>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<aside class="flex h-full w-64 shrink-0 flex-col border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)]">
					<div class="flex-1 overflow-y-auto p-4">
						<button
							type="button"
							onclick={backToSubjects}
							class="mb-3 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--sb-collapse-text)] transition hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
								<path
									d="M15 18l-6-6 6-6"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							Back to Subjects
						</button>
						<h2 class="mb-3 mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--sb-nav-text)] opacity-70">
							Subjects
						</h2>
						<nav class="space-y-1.5">
							{#each data.subjects as s (s._id)}
								<button
									type="button"
									onclick={() => selectSubject(s.slug)}
									class="block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition font-[var(--sb-font-nav)] {s.slug ===
									selectedSubjectSlug
										? 'bg-[var(--sb-nav-active-bg)] text-[var(--sb-nav-active-text)] shadow-[var(--sb-nav-active-glow)]'
										: 'text-[var(--sb-nav-text)] hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-text)]'}"
								>
									{s.name?.en ?? s.slug}
								</button>
							{/each}
						</nav>
					</div>
				</aside>

				<main class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div class="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden px-6 py-10">
						{#if selectedSubject}
							<div class="mb-6 shrink-0">
								<h2 class="text-2xl font-bold">{selectedSubject.name?.en ?? selectedSubject.slug}</h2>
								<p class="mt-1 text-sm text-[var(--page-text-muted)]">
									{#if isLoadingChapters}
										Loading chapters…
									{:else}
										{displayChapters.length} chapters
									{/if}
								</p>
							</div>
						{/if}

						{#if chaptersError}
							<p class="text-semantic-error">{chaptersError}</p>
						{:else if isLoadingChapters}
							<div class="flex flex-1 items-center justify-center text-[var(--page-text-muted)]">
								<p>Loading chapters…</p>
							</div>
						{:else if displayChapters.length === 0}
							<p class="text-[var(--page-text-muted)]">No chapters found for this subject.</p>
						{:else}
							<div class="flex-1 overflow-y-auto pb-6">
								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
									{#each displayChapters as { chapter, groupName } (chapter._id)}
										<a
											href={`/student-exam/${data.examSlug}/${encodeURIComponent(chapter.slug ?? chapter._id)}`}
											class="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--sh-tool-card-border)] bg-[var(--sh-tool-card-bg)] p-5 text-left text-[var(--sh-tool-card-text)] shadow-[var(--shadow-item)] transition hover:-translate-y-1 hover:border-[var(--sh-tool-card-hover-border)] hover:shadow-[var(--sh-tool-card-hover-shadow)]"
										>
											<div
												class="absolute left-0 top-0 h-1 w-full bg-[var(--sh-tool-card-hover-border)] opacity-0 transition-opacity group-hover:opacity-100"
											></div>
											<h2 class="text-base font-semibold leading-snug">
												{chapter.order}. {chapter.name?.en ?? chapter.slug}
											</h2>
											<p class="mt-1.5 text-xs opacity-70">{groupName}</p>
											<p
												class="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--sh-section-link)] transition group-hover:text-[var(--sh-section-link-hover)]"
											>
												View questions
												<span class="inline-block transition-transform group-hover:translate-x-1">→</span>
											</p>
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
