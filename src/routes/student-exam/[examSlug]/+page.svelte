<script lang="ts">
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import {
		fetchGroupedChaptersByExamSlug,
		type GroupedSubjectRow,
	} from "$lib/api/chapters";
	import { chaptersStore } from "$lib/stores/chapters";
	import {
		buildChaptersBySubjectFromGrouped,
		buildSubjectsFromGrouped,
	} from "$lib/student-exam/groupedExamData";

	type SubjectNavRow = {
		_id: string;
		slug: string;
		name?: { en: string; hi?: string };
		unitCount: number;
	};

	type ChapterLite = {
		_id: string;
		slug?: string;
		order?: number;
		name?: { en: string; hi?: string };
	};
	type ChapterCardRow = {
		chapter: ChapterLite;
		groupName: string;
		groupOrder: number;
	};

	/** No `+page.server.ts` here so client navigations do not fetch `__data.json` — only the grouped chapters API runs. */
	const examSlug = $derived(page.params.examSlug ?? "");

	/** Grouped API has no exam name; format slug for the header without another request. */
	function titleFromExamSlug(slug: string) {
		return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}

	let subjects = $state<SubjectNavRow[]>([]);
	let chaptersBySubjectSlug = $state<Record<string, ChapterCardRow[]>>({});
	let rawGrouped = $state<GroupedSubjectRow[]>([]);
	let chaptersLoading = $state(false);
	let chaptersError = $state<string | null>(null);
	let clientLoadSeq = 0;

	let selectedSubjectSlug = $state("");
	let showChapters = $state(false);
	let referrerHandled = $state(false);

	$effect(() => {
		if (!browser || referrerHandled) return;
		referrerHandled = true;
		const referrer = document.referrer;
		const isFromExamsOrDashboard =
			referrer.includes("/student/exams") ||
			referrer.includes("/student/dashboard");
		if (isFromExamsOrDashboard) {
			sessionStorage.removeItem(`exam-${examSlug}-subject`);
		}
	});

	$effect(() => {
		if (!browser) return;
		const slug = examSlug;
		if (!slug) return;
		const seq = ++clientLoadSeq;
		chaptersLoading = true;
		chaptersError = null;

		void (async () => {
			try {
				const res = await fetchGroupedChaptersByExamSlug(slug, fetch);
				if (seq !== clientLoadSeq) return;
				if (!res.success) {
					throw new Error(res.message || "Failed to load chapters");
				}
				const groupedList = (res.data?.data ?? []) as GroupedSubjectRow[];
				rawGrouped = groupedList;

				if (groupedList.length === 0) {
					subjects = [];
					chaptersBySubjectSlug = {};
					chaptersLoading = false;
					return;
				}

				const bySubject = buildChaptersBySubjectFromGrouped(groupedList);
				const subs = buildSubjectsFromGrouped(groupedList, bySubject);
				chaptersBySubjectSlug = bySubject;
				subjects = subs;
				chaptersStore.setGroupedChapters(slug, groupedList);
				chaptersLoading = false;
			} catch (e) {
				if (seq !== clientLoadSeq) return;
				chaptersError = e instanceof Error ? e.message : "Failed to load";
				chaptersLoading = false;
			}
		})();
	});

	const examTitle = $derived(titleFromExamSlug(examSlug));
	const viewParam = $derived(page.url.searchParams.get("view"));
	const pyqParam = $derived(page.url.searchParams.get("pyq"));

	const selectedSubject = $derived.by(() => {
		return (
			subjects?.find((s: SubjectNavRow) => s.slug === selectedSubjectSlug) ??
			null
		);
	});

	const displayChapters = $derived.by((): ChapterCardRow[] => {
		if (!selectedSubjectSlug) return [];
		return chaptersBySubjectSlug?.[selectedSubjectSlug] ?? [];
	});

	$effect(() => {
		if (!browser || subjects.length === 0) return;

		if (viewParam === "chapters") {
			showChapters = true;
			if (!selectedSubjectSlug) {
				const stored = sessionStorage.getItem(`exam-${examSlug}-subject`);
				if (stored && subjects.find((s) => s.slug === stored)) {
					selectedSubjectSlug = stored;
				} else if (subjects.length > 0) {
					selectedSubjectSlug = subjects[0].slug;
					sessionStorage.setItem(`exam-${examSlug}-subject`, selectedSubjectSlug);
				}
			}
		} else {
			showChapters = false;
			selectedSubjectSlug = "";
		}
	});

	function selectSubject(slug: string) {
		selectedSubjectSlug = slug;
		if (browser) {
			sessionStorage.setItem(`exam-${examSlug}-subject`, slug);
			const url = new URL(window.location.href);
			url.searchParams.set("view", "chapters");
			if (pyqParam === 'true') url.searchParams.set("pyq", "true");
			void goto(url.toString(), {
				noScroll: true,
				replaceState: true,
			});
		}
	}

	function backToSubjects() {
		if (browser) {
			sessionStorage.removeItem(`exam-${examSlug}-subject`);
			const url = new URL(window.location.href);
			url.searchParams.delete("view");
			void goto(url.toString(), {
				noScroll: true,
				replaceState: true,
			});
		}
	}
</script>

<svelte:head>
	<title>Student Exam {examSlug}</title>
</svelte:head>

<div
	class="flex h-full bg-[var(--page-bg)] text-[var(--page-text)]"
>
	<div class="mx-auto flex h-full w-full px-4 md:px-6">
		{#if !showChapters}
			<div class="flex flex-1 flex-col py-1">
				<a
	href="/student/exams"
	class="mb-3 inline-flex w-fit items-center rounded-md text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
>
	← Back
</a>

				<div class="mb-4">
					<h1 class="text-2xl font-bold md:text-3xl">
						{examTitle}
					</h1>
					<p class="mt-0.5 text-sm text-[var(--page-text-muted)]">
						Select a subject, then open units/chapters
					</p>
				</div>

				{#if chaptersError}
					<p class="text-semantic-error" role="alert">
						{chaptersError}
					</p>
				{:else if chaptersLoading && subjects.length === 0}
					<div
						class="flex-1 pb-3"
						aria-busy="true"
						aria-label="Loading subjects"
					>
						<div
							class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
						>
							{#each [1, 2, 3, 4, 5, 6] as sk (sk)}
								<div
									class="h-20 animate-pulse rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3"
								>
									<div
										class="h-4 w-3/4 rounded bg-[var(--page-text-muted)]/20"
									></div>
									<div
										class="mt-2 h-3 w-1/2 rounded bg-[var(--page-text-muted)]/15"
									></div>
								</div>
							{/each}
						</div>
					</div>
				{:else if !chaptersLoading && subjects.length === 0}
					<p class="text-[var(--page-text-muted)]">
						No subjects found for this exam.
					</p>
				{:else}
					<div class="flex-1 pb-3">
						<div
							class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
						>
							{#each subjects as s (s._id)}
								<button
									type="button"
									onclick={() => selectSubject(s.slug)}
									class="group flex flex-col rounded-[var(--radius-card)] border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-3 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)]"
								>
									<h2
										class="text-base font-semibold leading-snug text-[var(--sh-exam-card-title)]"
									>
										{s.name?.en ?? s.slug}
									</h2>
									<p
										class="mt-1 text-sm text-[var(--page-text-muted)]"
									>
										{s.unitCount} chapters
									</p>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<aside
				class="sticky top-0 hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-[var(--sb-border-color)] bg-gradient-to-b from-[var(--sb-bg-from)] to-[var(--sb-bg-to)]"
			>
				<div class="flex-1 overflow-y-auto p-2">
					<button
						type="button"
						onclick={backToSubjects}
						class="mb-3 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--sb-collapse-text)] transition hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
						>
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
					<h2
						class="mb-3 mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--sb-nav-text)] opacity-70"
					>
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
				<div
					class="mx-auto flex h-full min-h-0 w-full flex-col overflow-hidden px-4 md:px-6 py-5"
				>
					<button
						type="button"
						onclick={backToSubjects}
						class="mb-4 inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--page-card-bg)] border border-[var(--sh-exam-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--page-text-muted)] md:hidden transition hover:text-[var(--page-link-hover)]"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M15 18l-6-6 6-6"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Back to Subjects
					</button>



					{#if displayChapters.length === 0}
						<p class="text-[var(--page-text-muted)]">
							No chapters found for this subject.
						</p>
					{:else}
						<div class="flex-1 overflow-y-auto py-4">
							<div
								class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
							>
								{#each displayChapters as { chapter, groupName } (chapter._id)}
									<a
										href={`/student-exam/${examSlug}/${chapter._id}?page=1${pyqParam === 'true' ? '&pyq=true' : ''}`}
										class="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--sh-tool-card-border)] bg-[var(--sh-tool-card-bg)] p-3 text-left text-[var(--sh-tool-card-text)] shadow-[var(--shadow-item)] transition hover:-translate-y-1 hover:border-[var(--accent-cta-pink)] hover:shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--accent-cta-pink)_40%,transparent)]"
									>
										
										<h2
											class="text-sm font-semibold leading-snug"
										>
											{chapter.name?.en ?? chapter.slug}
										</h2>
										<p
											class="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--sh-section-link)] transition group-hover:text-[var(--accent-cta-pink)]"
										>
											View questions
											<span
												class="inline-block transition-transform group-hover:translate-x-1"
												>→</span
											>
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
