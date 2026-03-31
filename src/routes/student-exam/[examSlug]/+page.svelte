<script lang="ts">
	import { browser } from '$app/environment';
	import {
		fetchGroupedChaptersByExamSlug,
		fetchChaptersHierarchy,
		type GroupedSubjectRow,
	} from '$lib/api/chapters';
	import { fetchExamBySlug } from '$lib/api/exams';
	import { chaptersStore } from '$lib/stores/chapters';
	import {
		buildChaptersBySubjectFromGrouped,
		buildSubjectsFromGrouped,
	} from '$lib/student-exam/groupedExamData';

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
			_rawGrouped?: GroupedSubjectRow[];
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

	let examRecord = $state<Record<string, unknown> | null>(null);
	let subjects = $state<SubjectNavRow[]>([]);
	let chaptersBySubjectSlug = $state<Record<string, ChapterCardRow[]>>({});
	let rawGrouped = $state<GroupedSubjectRow[]>([]);
	let chaptersLoading = $state(false);
	let chaptersError = $state<string | null>(null);
	let clientLoadSeq = 0;

	let selectedSubjectSlug = $state('');
	let showChapters = $state(false);
	let referrerHandled = $state(false);
	let hasRestoredSession = $state(false);

	$effect(() => {
		if (!browser || referrerHandled) return;
		referrerHandled = true;
		const referrer = document.referrer;
		const isFromExamsOrDashboard =
			referrer.includes('/student/exams') || referrer.includes('/student/dashboard');
		if (isFromExamsOrDashboard) {
			sessionStorage.removeItem(`exam-${data.examSlug}-subject`);
		}
	});

	$effect(() => {
		if (!browser) return;
		const slug = data.examSlug;
		const seq = ++clientLoadSeq;
		chaptersLoading = true;
		chaptersError = null;

		void (async () => {
			try {
				const [res, examForTitle] = await Promise.all([
					fetchGroupedChaptersByExamSlug(slug, fetch),
					fetchExamBySlug(slug, null, fetch).catch(() => null),
				]);
				if (seq !== clientLoadSeq) return;
				if (examForTitle) {
					examRecord = examForTitle as Record<string, unknown>;
				}
				if (!res.success) {
					throw new Error(res.message || 'Failed to load chapters');
				}
				const groupedList = (res.data?.data ?? []) as GroupedSubjectRow[];
				rawGrouped = groupedList;

				if (groupedList.length > 0) {
					const bySubject = buildChaptersBySubjectFromGrouped(groupedList);
					const subs = buildSubjectsFromGrouped(groupedList, bySubject);
					chaptersBySubjectSlug = bySubject;
					subjects = subs;
					chaptersStore.setGroupedChapters(slug, groupedList);
					chaptersLoading = false;
					return;
				}

				const examFromApi = await fetchExamBySlug(slug, null, fetch);
				if (seq !== clientLoadSeq) return;
				if (!examFromApi) throw new Error('Exam not found');

				examRecord = examFromApi as Record<string, unknown>;
				const boardSlug = (examRecord.boardSlug ?? examRecord.board_slug ?? '') as string;
				const examSlugForHierarchy = (examRecord.slug ?? examRecord._id ?? slug) as string;
				if (!boardSlug || !examSlugForHierarchy) {
					throw new Error('Exam configuration incomplete');
				}

				const hierarchy = await fetchChaptersHierarchy(boardSlug, examSlugForHierarchy, null, fetch);
				if (seq !== clientLoadSeq) return;

				const subs = (hierarchy.subjects ?? [])
					.map((s): SubjectNavRow => {
						const groups = [...(s.chapterGroups ?? [])].sort(
							(a, b) => (a.order ?? 0) - (b.order ?? 0),
						);
						return {
							_id: s._id,
							slug: s.slug,
							name: s.name,
							unitCount: groups.length,
						};
					})
					.filter((s) => Boolean(s._id && s.slug && s.unitCount > 0));

				subjects = subs;
				chaptersBySubjectSlug = {};
				chaptersLoading = false;
			} catch (e) {
				if (seq !== clientLoadSeq) return;
				chaptersError = e instanceof Error ? e.message : 'Failed to load';
				chaptersLoading = false;
			}
		})();
	});

	$effect(() => {
		if (!browser || hasRestoredSession) return;
		if (subjects.length === 0) return;
		const referrer = document.referrer;
		const isFromChapterPage =
			referrer.includes(`/student-exam/${data.examSlug}/`) &&
			!referrer.endsWith(`/student-exam/${data.examSlug}`);
		if (isFromChapterPage) {
			const stored = sessionStorage.getItem(`exam-${data.examSlug}-subject`);
			if (stored && subjects.find((s: SubjectNavRow) => s.slug === stored)) {
				selectedSubjectSlug = stored;
				showChapters = true;
			}
		}
		hasRestoredSession = true;
	});

	const selectedSubject = $derived.by(() => {
		return subjects?.find((s: SubjectNavRow) => s.slug === selectedSubjectSlug) ?? null;
	});

	const displayChapters = $derived.by((): ChapterCardRow[] => {
		if (!selectedSubjectSlug) return [];
		return chaptersBySubjectSlug?.[selectedSubjectSlug] ?? [];
	});

	const examTitle = $derived(getExamTitleEn(examRecord ?? data.exam, data.examSlug));

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
							{examTitle}
						</h1>
						<p class="mt-2 text-base text-[var(--page-text-muted)]">Select a subject, then open units/chapters</p>
					</div>

					{#if chaptersError}
						<p class="text-semantic-error" role="alert">{chaptersError}</p>
					{:else if chaptersLoading && subjects.length === 0}
						<div class="flex-1 overflow-y-auto pb-6" aria-busy="true" aria-label="Loading subjects">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each [1, 2, 3, 4, 5, 6] as sk (sk)}
									<div
										class="h-28 animate-pulse rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5"
									>
										<div class="h-5 w-3/4 rounded bg-[var(--page-text-muted)]/20"></div>
										<div class="mt-3 h-4 w-1/2 rounded bg-[var(--page-text-muted)]/15"></div>
									</div>
								{/each}
							</div>
						</div>
					{:else if !chaptersLoading && subjects.length === 0}
						<p class="text-[var(--page-text-muted)]">No subjects found for this exam.</p>
					{:else}
						<div class="flex-1 overflow-y-auto pb-6">
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{#each subjects as s (s._id)}
									<button
										type="button"
										onclick={() => selectSubject(s.slug)}
										class="group flex flex-col rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)]"
									>
										<h2 class="text-lg font-semibold leading-snug text-[var(--sh-exam-card-title)]">
											{s.name?.en ?? s.slug}
										</h2>
										<p class="mt-2 text-sm text-[var(--page-text-muted)]">
											{s.unitCount} chapters
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
							{#each subjects as s (s._id)}
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
									{displayChapters.length} chapters
								</p>
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
