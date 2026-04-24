<script lang="ts">
	import MathText from "$lib/components/MathText.svelte";
	import { questionPromptEnContent, fetchQuestionById } from "$lib/api/questions";
	import { fetchTopicsByChapterSlug } from "$lib/api/topics";
	import type { PageData, ActionData } from "./$types";
	import { enhance } from "$app/forms";
	import { goto, replaceState } from "$app/navigation";
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { questionStore } from "$lib/stores/question";
	import { navigating } from "$app/stores";
	import { createReport, type ReportReason } from "$lib/api/reports";
import BackButton from "$lib/components/BackButton.svelte";

	type Question = PageData["questions"][number];
	type ImageLike =
		| string
		| { url?: string; alt?: string; publicId?: string; version?: number };

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let selectedQuestionIndex = $state<number | null>(null);
	let filterDrawerOpen = $state(false);

	let selectedDifficulties = $state<string[]>([]);
	let selectedKinds = $state<string[]>([]);
	let selectedTopics = $state<string[]>([]);
	let selectedApprove = $state<string>("");

	let topicOptions = $state<{ _id: string; slug: string; name?: { en?: string } }[]>([]);
	let topicsLoading = $state(false);

	let selectedOption = $state<string | null>(null);
	let isAnswerChecked = $state(false);
	let activeQuestionId = $state<string | null>(null);
	let isEditing = $state(false);
	let integerAnswer = $state<number | null>(null);
	let fillBlankAnswers = $state<string[]>([]);
	let currentQuestionNumber = $state<number | null>(null);

	// ── toast ──────────────────────────────────────────────────────────────
	let toastMsg = $state<string | null>(null);
	let toastType = $state<"success" | "error">("success");
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	function showToast(msg: string, type: "success" | "error" = "success") {
		if (toastTimer) clearTimeout(toastTimer);
		toastMsg = msg; toastType = type;
		toastTimer = setTimeout(() => { toastMsg = null; }, 3000);
	}

	// ── report ─────────────────────────────────────────────────────────────
	let reportModalOpen = $state(false);
	let reportingQuestionId = $state("");
	let reportReason = $state<ReportReason>("WRONG_QUESTION");
	const reportReasonOptions: { value: ReportReason; label: string }[] = [
		{ value: "WRONG_QUESTION", label: "Wrong Question" },
		{ value: "WRONG_ANSWER", label: "Wrong Answer" },
		{ value: "WRONG_SOLUTION", label: "Wrong Solution" },
		{ value: "TYPO", label: "Typo / Spelling error" },
		{ value: "BAD_LATEX", label: "Math Formatting (LaTeX) issue" },
		{ value: "MISSING_IMAGE", label: "Missing Image" },
		{ value: "WRONG_OPTIONS", label: "Incorrect Options" },
		{ value: "DUPLICATE", label: "Duplicate Question" },
		{ value: "OTHER", label: "Other" }
	];
	let reportReasonDropdownOpen = $state(false);
	let reportReasonDropdownRef = $state<HTMLElement | null>(null);
	let reportMessage = $state("");
	let isSubmittingReport = $state(false);

	function openReportModal(qid: string) {
		reportingQuestionId = qid;
		reportModalOpen = true;
		reportReasonDropdownOpen = false;
	}

	function closeReportModal() {
		reportModalOpen = false;
		reportReasonDropdownOpen = false;
	}

	function selectReportReason(reason: ReportReason) {
		reportReason = reason;
		reportReasonDropdownOpen = false;
	}

	async function handleReportSubmit() {
		if (!reportingQuestionId || !reportReason) return;
		isSubmittingReport = true;
		try {
			await createReport({
				questionId: reportingQuestionId,
				reason: reportReason,
				message: reportMessage
			});
			showToast("Report submitted successfully");
			closeReportModal();
			reportMessage = "";
		} catch (e: any) {
			showToast(e.message || "An error occurred", "error");
		} finally {
			isSubmittingReport = false;
		}
	}

	$effect(() => {
		if (!browser || !reportReasonDropdownOpen) return;
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target;
			if (
				reportReasonDropdownRef &&
				target instanceof Node &&
				!reportReasonDropdownRef.contains(target)
			) {
				reportReasonDropdownOpen = false;
			}
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				reportReasonDropdownOpen = false;
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	});

	/** Client-driven question view (shallow routing); stays in sync with server data on full navigations. */
	let effectiveQuestionId = $state<string | null>(null);
	let detailQuestion = $state<Question | null>(null);
	let detailLoading = $state(false);
	let detailLoadSeq = 0;
	let detailAbort: AbortController | null = null;

	// Keep filter state in sync with server-loaded data (source of truth on navigation)
	$effect(() => {
		const params = new URLSearchParams(
			browser ? window.location.search : ""
		);
		const diffParam = params.get("difficulty");
		const kindParam = params.get("kind");
		const topicParam = params.get("topic");

		selectedDifficulties = diffParam ? diffParam.split(",") : [];
		selectedKinds = kindParam ? kindParam.split(",") : [];
		selectedTopics = topicParam ? topicParam.split(",") : [];
		// Use server-provided approveStatus as source of truth
		selectedApprove = data.approveStatus ?? params.get("approve") ?? "";
	});

	let topicsLoadedFor = $state<string | null>(null);
	$effect(() => {
		if (!browser) return;
		const cp = data.chapterSlug || data.chapterParam;
		if (!cp || topicsLoadedFor === cp) return;
		topicsLoadedFor = cp;
		topicsLoading = true;
		void fetchTopicsByChapterSlug(cp, fetch)
			.then((r) => { if (r.success && r.data) topicOptions = r.data; })
			.catch(() => {})
			.finally(() => { topicsLoading = false; });
	});

	/** Full navigations only: shallow `replaceState` does not change `data`, so this won't overwrite client-driven id. */
	$effect(() => {
		const qid = data.questionId;
		const det = data.detailedQuestion;
		if (!qid) {
			// Don't clear if we have a client-driven question open (e.g. after form save)
			if (effectiveQuestionId) return;
			detailLoadSeq++;
			detailAbort?.abort();
			effectiveQuestionId = null;
			detailQuestion = null;
			detailLoading = false;
			return;
		}
		effectiveQuestionId = qid;
		if (det) {
			detailLoadSeq++;
			detailAbort?.abort();
			detailQuestion = det;
			questionStore.setCachedById(det._id, det);
			detailLoading = false;
		} else {
			detailQuestion = null;
		}
	});

	$effect(() => {
		if (!browser) return;
		const id = effectiveQuestionId;
		if (!id) return;
		if (detailQuestion?._id === id) return;
		const cached = questionStore.getCachedById(id);
		if (cached) {
			detailQuestion = cached;
			return;
		}
		const seq = ++detailLoadSeq;
		detailAbort?.abort();
		detailAbort = new AbortController();
		const signal = detailAbort.signal;
		detailLoading = true;
		void fetchQuestionById(id, undefined, { signal })
			.then((q) => {
				if (seq !== detailLoadSeq || signal.aborted) return;
				detailQuestion = q;
				questionStore.setCachedById(id, q);
			})
			.catch(() => {
				if (seq !== detailLoadSeq || signal.aborted) return;
				detailQuestion = null;
			})
			.finally(() => {
				if (seq === detailLoadSeq) detailLoading = false;
			});
	});

	$effect(() => {
		if (detailQuestion?._id !== activeQuestionId) {
			activeQuestionId = detailQuestion?._id ?? null;
			selectedOption = null;
			isAnswerChecked = false;
			isEditing = false;
			integerAnswer = null;
			fillBlankAnswers = [];
			
			if (detailQuestion?._id) {
				const idx = displayQuestions.findIndex((q: Question) => q._id === detailQuestion!._id);
				if (idx >= 0) {
					currentQuestionNumber = (data.safePage - 1) * (displayPaginationMeta?.limit ?? 25) + idx + 1;
				} else {
					currentQuestionNumber = null;
				}
			} else {
				currentQuestionNumber = null;
			}
		}
		if (form?.success) {
			isEditing = false;
		}
	});

	const PAGINATION_WINDOW = 2;

	const isLoading = $derived($navigating !== null);
	const isPyq = $derived(page.url.searchParams.get('pyq') === 'true');

	const storeChapterKey = $derived(data.resolvedChapterId);

	// Build a stable filter string to namespace the cache per active filters
	const activeFilterKey = $derived(
		[
			selectedDifficulties.slice().sort().join(','),
			selectedKinds.slice().sort().join(','),
			selectedTopics.slice().sort().join(','),
			selectedApprove
		].join('|')
	);

	const hasCurrentPage = $derived.by(() => {
		if (!storeChapterKey) return false;
		// Don't use cache when filters are active — always use fresh server data
		if (data.approveStatus || (data as any).difficulty || (data as any).kind) return false;
		$questionStore;
		return questionStore.hasPage(storeChapterKey, data.safePage, activeFilterKey);
	});

	const displayQuestions = $derived.by(() => {
		if (!storeChapterKey) return data.questions;
		// If any filter is active, always use server data directly
		if (data.approveStatus) return data.questions;
		$questionStore;
		return hasCurrentPage
			? (questionStore.getQuestionsForPage(
					storeChapterKey,
					data.safePage,
					activeFilterKey,
				) ?? data.questions)
			: data.questions;
	});

	const displayPaginationMeta = $derived.by(() => {
		if (!storeChapterKey) return data.paginationMeta;
		if (data.approveStatus) return data.paginationMeta;
		$questionStore;
		return hasCurrentPage
			? (questionStore.getPagination(storeChapterKey, activeFilterKey) ??
					data.paginationMeta)
			: data.paginationMeta;
	});

	async function ensureQuestionsPageCached(targetPage: number): Promise<Question[] | null> {
		if (!browser || !storeChapterKey || !displayPaginationMeta) return null;
		if (targetPage < 1 || targetPage > displayPaginationMeta.lastPage) return null;

		const cached = questionStore.getQuestionsForPage(
			storeChapterKey,
			targetPage,
			activeFilterKey,
		);
		if (cached?.length) return cached;

		try {
			const url = new URL(
				`${chapterBaseUrl(data.chapterParam)}/api`,
				window.location.origin,
			);
			url.searchParams.set("page", String(targetPage));
			url.searchParams.set(
				"limit",
				String(displayPaginationMeta?.limit ?? data.paginationMeta?.limit ?? 25),
			);
			const res = await fetch(url.toString(), {
				headers: { accept: "application/json" },
			});
			if (!res.ok) return null;
			const payload = await res.json();
			const pageQuestions = Array.isArray(payload?.questions)
				? (payload.questions as Question[])
				: [];
			const pageMeta = payload?.paginationMeta;

			if (pageQuestions.length > 0) {
				questionStore.setQuestionsPage(
					storeChapterKey,
					targetPage,
					pageQuestions,
					pageMeta ?? displayPaginationMeta ?? undefined,
					activeFilterKey,
				);
				for (const q of pageQuestions) {
					if (q?._id) questionStore.setCachedById(q._id, q);
				}
			}
			return pageQuestions.length ? pageQuestions : null;
		} catch {
			return null;
		}
	}

	$effect(() => {
		if (!browser || !detailQuestion || !effectiveQuestionId) return;
		const idx = displayQuestions.findIndex((q: Question) => q._id === detailQuestion!._id);
		const prefetch = (qid: string | undefined) => {
			if (!qid || questionStore.getCachedById(qid)) return;
			void fetchQuestionById(qid)
				.then((q) => questionStore.setCachedById(qid, q))
				.catch(() => {});
		};
		const run = () => {
			if (idx > 0) prefetch(displayQuestions[idx - 1]?._id);
			if (idx >= 0 && idx < displayQuestions.length - 1) prefetch(displayQuestions[idx + 1]?._id);
			if (
				idx >= 0 &&
				idx <= 1 &&
				data.safePage > 1 &&
				storeChapterKey &&
				!data.approveStatus
			) {
				void ensureQuestionsPageCached(data.safePage - 1);
			}
			if (
				idx >= 0 &&
				idx >= displayQuestions.length - 2 &&
				displayPaginationMeta &&
				data.safePage < displayPaginationMeta.lastPage &&
				storeChapterKey &&
				!data.approveStatus
			) {
				void ensureQuestionsPageCached(data.safePage + 1);
			}
		};
		let idleId: ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout> | undefined;
		if (typeof requestIdleCallback !== 'undefined') {
			idleId = requestIdleCallback(run);
			return () => cancelIdleCallback(idleId as number);
		}
		idleId = setTimeout(run, 120);
		return () => clearTimeout(idleId as ReturnType<typeof setTimeout>);
	});

	$effect(() => {
		if (!browser) return;
		if (!storeChapterKey) return;
		if (!data.questions.length) return;
		// Don't cache filtered results
		if (data.approveStatus) return;

		// Always write fresh server data to the correct filter-namespaced cache slot
		questionStore.setQuestionsPage(
			storeChapterKey,
			data.safePage,
			data.questions,
			data.paginationMeta ?? undefined,
			activeFilterKey,
		);
	});

	const chapterBaseUrl = (chapterParamOverride?: string) =>
		`/student-exam/${data.examSlug}/${encodeURIComponent(chapterParamOverride ?? data.chapterParam)}`;

	const activeFiltersQuery = (opts?: { page?: number }) => {
		const params = new URLSearchParams();
		params.set("page", String(opts?.page ?? 1));
		if (selectedDifficulties.length > 0) {
			params.set("difficulty", selectedDifficulties.join(","));
		}
		if (selectedKinds.length > 0) {
			params.set("kind", selectedKinds.join(","));
		}
		if (selectedTopics.length > 0) {
			params.set("topic", selectedTopics.join(","));
		}
		if (selectedApprove) {
			params.set("approve", selectedApprove);
		}
		if (isPyq) {
			params.set("pyq", "true");
		}
		return params.toString();
	};

	function toggleDifficulty(diff: string) {
		if (selectedDifficulties.includes(diff)) {
			selectedDifficulties = selectedDifficulties.filter(
				(d) => d !== diff,
			);
		} else {
			selectedDifficulties = [...selectedDifficulties, diff];
		}
	}

	function toggleKind(kind: string) {
		if (selectedKinds.includes(kind)) {
			selectedKinds = selectedKinds.filter((k) => k !== kind);
		} else {
			selectedKinds = [...selectedKinds, kind];
		}
	}

	function toggleTopic(slug: string) {
		if (selectedTopics.includes(slug)) {
			selectedTopics = selectedTopics.filter((s) => s !== slug);
		} else {
			selectedTopics = [...selectedTopics, slug];
		}
	}

	function applyFilters() {
		const url = `${chapterBaseUrl()}?${activeFiltersQuery({ page: 1 })}`;
		void goto(url);
		filterDrawerOpen = false;
	}

	function setApprove(status: string) {
		selectedApprove = status;
		applyFilters();
	}

	function clearFilters() {
		selectedDifficulties = [];
		selectedKinds = [];
		selectedTopics = [];
		selectedApprove = "";
		const url = `${chapterBaseUrl()}?page=1`;
		void goto(url);
		filterDrawerOpen = false;
	}

	const chapterHref = (
		chapterParamValue: string,
		opts?: {
			page?: number;
			preview?: boolean;
			reviewStart?: number;
			carry?: boolean;
			questionId?: string;
		},
	) => {
		const params = new URLSearchParams(activeFiltersQuery(opts));
		if (opts?.preview) params.set("preview", "1");
		if (typeof opts?.reviewStart === "number")
			params.set("reviewStart", String(opts.reviewStart));
		if (opts?.carry) params.set("carry", "1");
		if (opts?.questionId) params.set("questionId", opts.questionId);
		return `${chapterBaseUrl(chapterParamValue)}?${params.toString()}`;
	};

	const questionsPageUrl = (p: number) =>
		`${chapterBaseUrl()}?${activeFiltersQuery({ page: p })}`;

	type PaginationItem =
		| { type: "page"; page: number }
		| { type: "ellipsis"; key: string; targetPage: number };

	const paginationItems = $derived.by((): PaginationItem[] => {
		const meta = displayPaginationMeta;
		if (!meta || meta.lastPage <= 1) return [];

		const last = meta.lastPage;
		const current = data.safePage;
		const sibling = Math.max(1, PAGINATION_WINDOW - 1);
		const items: PaginationItem[] = [];

		const pushPage = (page: number) => {
			items.push({ type: "page", page });
		};

		const pushRange = (start: number, end: number) => {
			for (let p = start; p <= end; p += 1) pushPage(p);
		};

		if (last <= 7) {
			pushRange(1, last);
			return items;
		}

		pushPage(1);

		const leftGap = current - sibling > 2;
		const rightGap = current + sibling < last - 1;

		if (!leftGap && rightGap) {
			// Near start: 1 2 3 ... last
			pushRange(2, Math.min(last - 1, 2 + sibling * 2));
			items.push({
				type: "ellipsis",
				key: "right",
				targetPage: Math.min(last - 1, current + sibling * 2 + 2),
			});
		} else if (leftGap && !rightGap) {
			// Near end: 1 ... (last-2) (last-1) last
			items.push({
				type: "ellipsis",
				key: "left",
				targetPage: Math.max(2, current - sibling * 2 - 2),
			});
			pushRange(Math.max(2, last - (sibling * 2 + 1)), last - 1);
		} else if (leftGap && rightGap) {
			// Middle: 1 ... (current-1) current (current+1) ... last
			items.push({
				type: "ellipsis",
				key: "left",
				targetPage: Math.max(2, current - sibling - 1),
			});
			pushRange(current - sibling, current + sibling);
			items.push({
				type: "ellipsis",
				key: "right",
				targetPage: Math.min(last - 1, current + sibling + 1),
			});
		}

		pushPage(last);
		return items;
	});

	function openQuestionPreview(index: number) {
		const q = displayQuestions[index];
		if (!q) return;
		replaceState(
			chapterHref(data.chapterParam, {
				page: data.safePage,
				questionId: q._id,
			}),
			{},
		);
		effectiveQuestionId = q._id;
	}

	function goDetailedPrev() {
		const dq = detailQuestion;
		if (!dq) return;
		const currentIdx = displayQuestions.findIndex(
			(q: Question) => q._id === dq._id,
		);
		if (currentIdx > 0) {
			const prevQ = displayQuestions[currentIdx - 1];
			replaceState(
				chapterHref(data.chapterParam, {
					page: data.safePage,
					questionId: prevQ._id,
				}),
				{},
			);
			effectiveQuestionId = prevQ._id;
		} else if (data.safePage > 1) {
			const targetPage = data.safePage - 1;
			const goToPreviousPage = async () => {
				const prevPageQuestions = await ensureQuestionsPageCached(targetPage);
				const prevPageQuestionId = prevPageQuestions?.[prevPageQuestions.length - 1]?._id;
				if (prevPageQuestionId) {
					void goto(
						chapterHref(data.chapterParam, {
							page: targetPage,
							questionId: prevPageQuestionId,
						}),
					);
					return;
				}
				void goto(chapterHref(data.chapterParam, { page: targetPage }));
			};
			void goToPreviousPage();
		}
	}

	function goDetailedNext() {
		const dq = detailQuestion;
		if (!dq) return;
		const currentIdx = displayQuestions.findIndex(
			(q: Question) => q._id === dq._id,
		);
		if (currentIdx >= 0 && currentIdx < displayQuestions.length - 1) {
			const nextQ = displayQuestions[currentIdx + 1];
			replaceState(
				chapterHref(data.chapterParam, {
					page: data.safePage,
					questionId: nextQ._id,
				}),
				{},
			);
			effectiveQuestionId = nextQ._id;
		} else if (
			displayPaginationMeta &&
			data.safePage < displayPaginationMeta.lastPage
		) {
			const targetPage = data.safePage + 1;
			const goToNextPage = async () => {
				const nextPageQuestions = await ensureQuestionsPageCached(targetPage);
				const nextPageQuestionId = nextPageQuestions?.[0]?._id;
				if (nextPageQuestionId) {
					void goto(
						chapterHref(data.chapterParam, {
							page: targetPage,
							questionId: nextPageQuestionId,
						}),
					);
					return;
				}
				void goto(chapterHref(data.chapterParam, { page: targetPage }));
			};
			void goToNextPage();
		}
	}

	const canGoDetailedPrev = $derived(
		detailQuestion != null
			? displayQuestions.findIndex(
					(q: Question) => q._id === detailQuestion!._id,
				) > 0 || data.safePage > 1
			: false,
	);

	const canGoDetailedNext = $derived(
		detailQuestion != null
			? displayQuestions.findIndex(
					(q: Question) => q._id === detailQuestion!._id,
				) < displayQuestions.length - 1 ||
					!!(
						displayPaginationMeta &&
						data.safePage < displayPaginationMeta.lastPage
					)
			: false,
	);

	function closeQuestionPreview() {
		replaceState(`${chapterBaseUrl()}?${activeFiltersQuery({ page: data.safePage })}`, {});
		effectiveQuestionId = null;
		detailQuestion = null;
		detailLoading = false;
	}

	function imageSrc(image: ImageLike): string {
		if (typeof image === "string") return image;
		return image?.url ?? "";
	}

	function imageAlt(image: ImageLike): string {
		if (typeof image === "string") return "";
		return image?.alt ?? "";
	}

	function imageKey(image: ImageLike): string {
		if (typeof image === "string") return image;
		const url = image?.url;
		if (url) return url;
		const publicId = image?.publicId;
		const version = image?.version;
		if (publicId) return `${publicId}::${version ?? ""}`;
		return "";
	}

	function promptImagesOnly(q: Question): ImageLike[] {
		const promptImages =
			(q as any)?.images ?? (q as any)?.prompt?.en?.images ?? [];
		if (!Array.isArray(promptImages) || promptImages.length === 0)
			return [];
		return promptImages as ImageLike[];
	}
</script>

<svelte:head>
	<title>Questions</title>
	<style>
		body {
			overflow: hidden;
		}
	</style>
</svelte:head>

<div
	class="flex h-full overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]"
>
	<div class="mx-auto max-w-6xl flex h-full w-full  overflow-hidden ">
		<main class="flex flex-1 flex-col overflow-hidden min-h-0">
			<div
				class="mx-auto flex h-full w-full flex-col px-4 md:px-6 overflow-hidden min-h-0 "
			>
				{#if data.message}
					<div
						class="flex flex-1 items-center justify-center text-semantic-error"
					>
						{data.message}
					</div>
				{:else}
					<div class="p-3 shrink-0">
						<div class="flex items-start justify-between gap-3">
							<div class="flex flex-col gap-1.5 text-sm text-[var(--page-text-muted)]">
								{#if effectiveQuestionId !== null}
									<BackButton label="Back" onClick={closeQuestionPreview} />
								{:else}
									<BackButton
										label="Back"
										href={`/student-exam/${data.examSlug}?view=chapters${isPyq ? '&pyq=true' : ''}`}
									/>
								{/if}
								{#if displayPaginationMeta}
									<span class="pl-1">
										{displayPaginationMeta.total} questions • Page {data.safePage} of {displayPaginationMeta.lastPage}
									</span>
								{/if}
							</div>

							{#if !effectiveQuestionId}
								<div class="flex shrink-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
									{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
										<div class="flex flex-wrap items-center justify-center gap-1.5">
											{#if data.safePage > 1}
												<a
													class="pagination-btn"
													href={questionsPageUrl(data.safePage - 1)}
												>
													Prev
												</a>
											{/if}

											{#each paginationItems as item (`top-${item.type}-${item.type === 'page' ? item.page : item.key}`)}
												{#if item.type === "page"}
													<a
														class="pagination-btn px-3.5 {item.page === data.safePage ? 'page-link-active' : ''}"
														href={questionsPageUrl(item.page)}
													>
														{item.page}
													</a>
												{:else}
													<a
														class="pagination-btn px-3.5"
														href={questionsPageUrl(item.targetPage)}
														aria-label="Jump pages"
													>
														...
													</a>
												{/if}
											{/each}

											{#if data.safePage < displayPaginationMeta.lastPage}
												<a
													class="pagination-btn"
													href={questionsPageUrl(data.safePage + 1)}
												>
													Next
												</a>
											{/if}
										</div>
									{/if}

									<div class="flex items-center rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-1 shadow-sm">
										<button
											type="button"
											onclick={() => setApprove("")}
											class="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 {selectedApprove === "" ? 'bg-[var(--page-link)] text-white shadow-md' : 'text-[var(--page-text-muted)] hover:text-[var(--page-text)]'}"
										>
											All
										</button>
										<button
											type="button"
											onclick={() => setApprove("true")}
											class="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 {selectedApprove === "true" ? 'bg-brand-secondary text-white shadow-md' : 'text-[var(--page-text-muted)] hover:text-brand-secondary'}"
										>
											Approved
										</button>
										<button
											type="button"
											onclick={() => setApprove("false")}
											class="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 {selectedApprove === "false" ? 'bg-semantic-error text-white shadow-md' : 'text-[var(--page-text-muted)] hover:text-semantic-error'}"
										>
											Unapproved
										</button>
									</div>

									<button
										type="button"
										class="flex items-center gap-2 rounded-lg text-sm font-medium text-[var(--sh-ai-sub)] hover:text-[var(--sh-section-title)]"
										onclick={() =>
											(filterDrawerOpen = !filterDrawerOpen)}
									>
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
										{filterDrawerOpen ? "Hide Filters" : "Show Filters"}
									</button>
								</div>
							{/if}
						</div>
					</div>

					{#if !effectiveQuestionId && filterDrawerOpen}
						<div class="mb-4">
							<div
								class="mt-3 grid gap-4 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] p-4"
							>
								<div>
									<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">
										Difficulty
									</div>
									<div class="flex flex-wrap gap-2.5">
										{#each ["easy", "medium", "hard"] as diff}
											<button
												type="button"
												onclick={() => toggleDifficulty(diff)}
												class="rounded-lg border px-3 py-1.5 text-xs font-medium transition {selectedDifficulties.includes(
													diff,
												)
													? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
													: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
											>
												{diff}
											</button>
										{/each}
									</div>
								</div>

								<div>
									<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">
										Type
									</div>
									<div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
										{#each ["MCQ", "MSQ", "TRUE_FALSE", "INTEGER", "FILL_BLANK", "COMPREHENSION_PASSAGE"] as kindOption}
											<button
												type="button"
												onclick={() => toggleKind(kindOption)}
												class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {selectedKinds.includes(
													kindOption,
												)
													? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
													: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
											>
												{kindOption}
											</button>
										{/each}
									</div>
								</div>

								<div>
									<div class="mb-3 text-sm font-semibold text-[var(--page-text)]">
										Topic
									</div>
									<div class="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
										{#if topicsLoading}
											<div class="animate-pulse grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
												{#each Array(4) as _}
													<div class="h-9 rounded-xl bg-[var(--sb-border-color)]/30"></div>
												{/each}
											</div>
										{:else}
											<div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
												{#each topicOptions as topic}
													<button
														type="button"
														onclick={() => toggleTopic(topic.slug)}
														class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {selectedTopics.includes(topic.slug)
															? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
															: 'border-[var(--sb-border-color)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/50'}"
													>
														{topic.name?.en || topic.slug}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								</div>

								<div class="flex items-center gap-3 border-t border-[var(--sb-border-color)] pt-4">
									<button
										type="button"
										class="flex-1 rounded-xl border border-[var(--sb-border-color)] px-3 py-2 text-sm font-medium text-[var(--sb-nav-text)] transition hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]"
										onclick={clearFilters}
									>
										Clear
									</button>
									<button
										type="button"
										class="flex-1 rounded-xl bg-[var(--page-link)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--page-link-hover)]"
										onclick={applyFilters}
									>
										Apply
									</button>
								</div>
							</div>
						</div>
					{/if}

					{#if displayQuestions.length === 0}
						<div class="flex flex-1 items-center justify-center">
							<div
								class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]"
							>
								No questions found.
							</div>
						</div>
					{:else if !effectiveQuestionId}
						<div class="flex-1 overflow-y-auto py-3">
							{#if isLoading}
								<div class="flex flex-col gap-2.5">
									{#each Array(10) as _, i}
										<div
											class="animate-pulse rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3"
										>
											<div
												class="flex items-baseline gap-3"
											>
												<div
													class="h-4 w-8 shrink-0 rounded bg-[var(--page-bg)]"
												></div>
												<div class="flex-1 space-y-2">
													<div
														class="h-4 w-full rounded bg-[var(--page-bg)]"
													></div>
													<div
														class="h-4 w-3/4 rounded bg-[var(--page-bg)]"
													></div>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col gap-4">
									{#each displayQuestions as q, index (q._id)}
										<button
											type="button"
											class="question-card group rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-tool-card-bg)] px-4 py-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-md"
											onclick={() => openQuestionPreview(index)}
										>
											<div class="flex items-center gap-2.5">
												<div
													class="shrink-0 text-[11px] font-medium text-[var(--page-text-muted)] opacity-90"
												>
													{(data.safePage - 1) *
														(displayPaginationMeta?.limit ??
															10) +
														index +
														1}.
												</div>
												<div
													class="flex-1 text-[0.95rem] font-normal leading-relaxed text-[var(--page-text)]"
												>
													<MathText
														content={questionPromptEnContent(
															q,
														)}
													/>
													{#if promptImagesOnly(q).length}
														<div
															class="mt-2.5 grid grid-cols-2 gap-2"
														>
															{#each promptImagesOnly(q) as img, imgIdx (`main-${q._id}-${imgIdx}`)}
																{@const src =
																	imageSrc(
																		img as ImageLike,
																	)}
																{#if src}
																	<img
																		{src}
																		alt={imageAlt(
																	img as ImageLike,
																		)}
																		class="max-h-36 w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																		loading="lazy"
																	/>
																{/if}
															{/each}
														</div>
													{/if}
												</div>
											</div>
											{#if (q as any).paperId}
												<div class="mt-2 pl-0.5">
													<div
														class="inline-flex rounded border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--page-link)] leading-tight"
													>
														{(q as any).paperId}
													</div>
												</div>
											{/if}
										</button>
									{/each}
								</div>
							{/if}
						</div>

						{#if displayPaginationMeta && displayPaginationMeta.lastPage > 1}
							<div
								class="border-t border-[var(--page-card-border)] py-3 shrink-0"
							>
								<div
									class="flex flex-wrap items-center justify-center gap-1.5"
								>
									{#if data.safePage > 1}
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage - 1,
											)}>Prev</a
										>
									{/if}

									{#each paginationItems as item (`bottom-${item.type}-${item.type === 'page' ? item.page : item.key}`)}
										{#if item.type === "page"}
											<a
												class="pagination-btn px-3.5 {item.page === data.safePage ? 'page-link-active' : ''}"
												href={questionsPageUrl(item.page)}
											>
												{item.page}
											</a>
										{:else}
											<a
												class="pagination-btn px-3.5"
												href={questionsPageUrl(item.targetPage)}
												aria-label="Jump pages"
											>
												...
											</a>
										{/if}
									{/each}

									{#if data.safePage < displayPaginationMeta.lastPage}
										<a
											class="pagination-btn"
											href={questionsPageUrl(
												data.safePage + 1,
											)}>Next</a
										>
									{/if}
								</div>
							</div>
						{/if}
					{:else}
						<div class="flex-1 overflow-hidden min-h-0">
							<div
								class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--page-bg)] p-4 shadow-sm flex flex-col h-full min-h-0"
							>
								{#if detailLoading && !detailQuestion}
									<div class="flex flex-col gap-4 animate-pulse" aria-busy="true">
										<div class="h-6 w-40 rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-full max-w-2xl rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-full max-w-xl rounded bg-[var(--page-card-border)]"></div>
										<div class="h-4 w-2/3 rounded bg-[var(--page-card-border)]"></div>
										<div class="mt-6 grid grid-cols-2 gap-3">
											<div class="h-24 rounded-xl bg-[var(--page-card-border)]"></div>
											<div class="h-24 rounded-xl bg-[var(--page-card-border)]"></div>
										</div>
									</div>
								{:else if !detailQuestion}
									<div class="text-center text-[var(--page-text-muted)] py-12">
										Unable to load this question.
									</div>
								{:else if isEditing}
									<form
										method="POST"
										action="?/updateQuestion"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === "success" || result.type === "redirect") {
													isEditing = false;
													showToast("Question updated successfully!");
													const qid = effectiveQuestionId;
													if (qid) {
														void fetchQuestionById(qid).then((q) => {
														detailQuestion = q;
														questionStore.setCachedById(qid, q);
													}).catch(() => {});
													}
												} else {
													showToast("Failed to update question.", "error");
													const { applyAction } = await import("$app/forms");
													await applyAction(result);
												}
											};
										}}
										class="flex flex-col h-full min-h-0 overflow-hidden relative"
									>
										{#if form?.message}
											<div
												class="mb-4 shrink-0 rounded-md bg-semantic-error/10 p-3 text-sm text-semantic-error border border-semantic-error/20"
											>
												{form.message}
											</div>
										{/if}

										<input
											type="hidden"
											name="questionId"
											value={detailQuestion._id}
										/>

										<!-- Scrollable form body -->
										<div class="flex-1 overflow-y-auto min-h-0 pr-1">
											<!-- Approval Status -->
											<div class="mb-5 flex items-center justify-between rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4">
												<div>
													<h3 class="text-sm font-semibold text-[var(--page-text)]">Approval Status</h3>
													<p class="text-xs text-[var(--page-text-muted)] mt-0.5">Toggle to approve or unapprove this question</p>
												</div>
												<select 
													name="approve" 
													class="rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] px-3 py-2 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
												>
													<option value="true" selected={(detailQuestion as any).approve}>Approved</option>
													<option value="false" selected={!(detailQuestion as any).approve}>Unapproved</option>
												</select>
											</div>

											<!-- Form body -->
											<div class="mb-5">
												<label
													class="block text-sm font-semibold text-[var(--page-text)] mb-2"
													for="promptContent"
												>
													Question Text
												</label>
												<textarea
													id="promptContent"
													name="promptContent"
													class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-[1.05rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
													rows="5"
													>{detailQuestion.prompt?.en?.content ?? ""}</textarea
												>
											</div>

											<!-- Options Grid for Editing -->
											{#if detailQuestion.prompt?.en?.options?.length}
												<div class="mb-5">
													<div
														class="block text-sm font-semibold text-[var(--page-text)] mb-3"
													>
														Options
													</div>
													<div
														class="grid grid-cols-1 md:grid-cols-2 gap-4"
													>
														{#each detailQuestion.prompt.en.options as option, i (option.identifier)}
															<div
																class="flex flex-col gap-2 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4 shadow-sm"
															>
																<div
																	class="flex items-center gap-2"
																>
																	<span
																		class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]"
																		>{option.identifier}</span
																	>
																	<span
																		class="text-xs font-semibold text-[var(--page-text-muted)]"
																		>Content</span
																	>
																</div>
																<input
																	type="hidden"
																	name="option_{i}_id"
																	value={option.identifier}
																/>
																<textarea
																	name="option_{i}_content"
																	class="w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] p-2.5 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
																	rows="2"
																	>{option.content ??
																		""}</textarea
																>
															</div>
														{/each}
													</div>
												</div>
											{/if}

											<!-- Explanation -->
											<div class="mb-5">
												<label
													class="block text-sm font-semibold text-[var(--page-text)] mb-2"
													for="explanationContent"
													>Solution / Explanation</label
												>
												<textarea
													name="explanationContent"
													id="explanationContent"
													class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-[1rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
													rows="6"
													>{detailQuestion.prompt?.en?.explanation ?? ""}</textarea
												>
											</div>

											<!-- Re-phrased Explanation -->
											<div class="mb-6">
												<label
													class="block text-sm font-semibold text-[var(--page-text)] mb-2"
													for="rePhrasedExplanationContent"
													>Re-phrased Explanation</label
												>
												<textarea
													name="rePhrasedExplanationContent"
													id="rePhrasedExplanationContent"
													class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-[1rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
													rows="6"
													>{detailQuestion.prompt?.en?.rePhrasedExplanation ?? ""}</textarea
												>
											</div>

											<!-- Correct Answer Editing -->
											{#if (detailQuestion as any).kind === 'MCQ' || (detailQuestion as any).kind === 'MSQ' || (detailQuestion as any).kind === 'TRUE_FALSE'}
												{@const qKind = (detailQuestion as any).kind}
												{@const qCorrect = (detailQuestion as any).correct}
												<div class="mb-6 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4">
													<div class="text-sm font-semibold text-[var(--page-text)] mb-3">
														Correct Answer{qKind === 'MSQ' ? 's' : ''} <span class="text-xs font-normal text-[var(--page-text-muted)]">({qKind})</span>
													</div>
													<div class="flex flex-wrap gap-3">
														{#each (detailQuestion.prompt?.en?.options ?? []) as opt}
															<label class="flex items-center gap-2 cursor-pointer select-none">
																<input
																	type={qKind === 'MSQ' ? 'checkbox' : 'radio'}
																	name="correct_identifier"
																	value={opt.identifier}
																	checked={qCorrect?.identifiers?.includes(opt.identifier) ?? false}
																	class="accent-[var(--page-link)] w-4 h-4"
																/>
																<span class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]">{opt.identifier}</span>
																<span class="text-sm text-[var(--page-text)] max-w-[160px] truncate">{opt.content}</span>
															</label>
														{/each}
													</div>
												</div>
											{:else if (detailQuestion as any).kind === 'INTEGER'}
												{@const qCorrect = (detailQuestion as any).correct}
												<div class="mb-6 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4">
													<label class="block text-sm font-semibold text-[var(--page-text)] mb-2" for="correct_integer">
														Correct Answer <span class="text-xs font-normal text-[var(--page-text-muted)]">(INTEGER)</span>
													</label>
													<input
														type="number"
														id="correct_integer"
														name="correct_integer"
														value={qCorrect?.integer ?? ''}
														class="w-full max-w-xs rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] px-3 py-2 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
														placeholder="Enter integer"
													/>
												</div>
											{:else if (detailQuestion as any).kind === 'FILL_BLANK'}
												{@const qCorrect = (detailQuestion as any).correct}
												<div class="mb-6 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4">
													<div class="text-sm font-semibold text-[var(--page-text)] mb-3">
														Correct Fills <span class="text-xs font-normal text-[var(--page-text-muted)]">(FILL_BLANK)</span>
													</div>
													<div class="space-y-2">
														{#each (qCorrect?.fills ?? ['']) as fill, fi}
															<div class="flex items-center gap-2">
																<span class="text-xs text-[var(--page-text-muted)] w-5 shrink-0">{fi + 1}.</span>
																<input
																	type="text"
																	name="correct_fill_{fi}"
																	value={fill}
																	class="flex-1 rounded-lg border border-[var(--page-card-border)] bg-[var(--page-bg)] px-3 py-2 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition"
																	placeholder="Fill {fi + 1}"
																/>
															</div>
														{/each}
													</div>
													<input type="hidden" name="correct_fills_count" value={qCorrect?.fills?.length ?? 1} />
												</div>
											{/if}
										</div>

										<!-- Footer Buttons for Edit -->
										<div
											class="shrink-0 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--sh-exam-card-border)] pt-4 mt-2"
										>
											<button
												type="button"
												class="rounded-lg border border-[var(--page-card-border)] px-5 py-2.5 text-sm font-semibold text-[var(--page-text-muted)] hover:bg-[var(--sh-exam-card-hover-border)]/20 transition"
												onclick={() =>
													(isEditing = false)}
												>Cancel</button
											>
											<button
												type="submit"
												class="rounded-lg bg-[var(--page-link)] text-white px-6 py-2.5 text-sm font-bold shadow-md shadow-[var(--page-link)]/20 hover:bg-[var(--page-link-hover)] hover:shadow-lg transition"
												>Save Changes</button
											>
										</div>
									</form>
								{:else}
									<div class="flex flex-col h-full min-h-0 overflow-hidden">
										<div class="flex-1 overflow-y-auto min-h-0 pr-1">
										<div
										class="mb-3"
									>
										<div class="flex flex-wrap items-center gap-2 mb-1.5">
											{#if (detailQuestion as any).approve}
												<div class="inline-flex rounded-md border border-brand-secondary/30 bg-brand-secondary/10 px-2 py-0.5 text-xs font-semibold text-brand-secondary">
													Approved
												</div>
											{:else}
												<div class="inline-flex rounded-md border border-semantic-error/30 bg-semantic-error/10 px-2 py-0.5 text-xs font-semibold text-semantic-error">
													Unapproved
												</div>
											{/if}
											<!-- Quick approve toggle -->
											<form
												method="POST"
												action="?/updateApprove"
												use:enhance={() => {
													return async ({ result }) => {
														if (result.type === 'success') {
															const newVal = !(detailQuestion as any).approve;
															detailQuestion = { ...detailQuestion!, approve: newVal } as any;
															questionStore.setCachedById(detailQuestion!._id, detailQuestion!);
															showToast(newVal ? 'Approved' : 'Unapproved');
														} else {
															showToast('Failed to update', 'error');
														}
													};
												}}
											>
												<input type="hidden" name="questionId" value={detailQuestion._id} />
												<input type="hidden" name="approve" value={String(!(detailQuestion as any).approve)} />
												<button
													type="submit"
													class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition
														{(detailQuestion as any).approve
															? 'border-semantic-error/40 bg-semantic-error/10 text-semantic-error hover:bg-semantic-error/20'
															: 'border-brand-secondary/40 bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20'}"
												>
													{#if (detailQuestion as any).approve}
														✗ Unapprove
													{:else}
														✓ Approve
													{/if}
												</button>
											</form>
											<button
												type="button"
												onclick={() => (isEditing = true)}
												class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--page-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--page-text)] shadow-sm hover:bg-[var(--sh-exam-card-hover-border)]/20 transition"
											>
												<svg
													width="12"
													height="12"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M12 20h9"></path>
													<path
														d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
													></path>
												</svg>
												Edit
											</button>
											<button
												type="button"
												onclick={() => openReportModal(detailQuestion!._id)}
												class="inline-flex items-center gap-1.5 rounded-lg border border-semantic-error/20 bg-semantic-error/5 px-2.5 py-1 text-xs font-semibold text-semantic-error shadow-sm hover:bg-semantic-error/10 transition"
												title="Report Question"
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<circle cx="12" cy="12" r="10"></circle>
													<line x1="12" y1="8" x2="12" y2="12"></line>
													<line x1="12" y1="16" x2="12.01" y2="16"></line>
												</svg>
												Report
											</button>
										</div>
									</div>

									<div
										class="mb-5 text-[1.05rem] leading-relaxed text-[var(--page-text)]"
									>
										<div class="flex items-start gap-2">
											{#if currentQuestionNumber !== null}
												<span class="shrink-0 font-semibold text-[var(--page-text-muted)]">
													{currentQuestionNumber}.
												</span>
											{/if}
										<MathText
											content={questionPromptEnContent(
												detailQuestion,
											)}
										/>
										</div>
										{#if promptImagesOnly(detailQuestion).length}
											<div
												class="mt-3 grid grid-cols-2 gap-2.5"
											>
												{#each promptImagesOnly(detailQuestion) as img, imgIdx (`main-${detailQuestion._id}-${imgIdx}`)}
													{@const src = imageSrc(
														img as ImageLike,
													)}
													{#if src}
														<img
															{src}
															alt={imageAlt(
																img as ImageLike,
															)}
															class="max-h-60 w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain shadow-sm"
															loading="lazy"
														/>
													{/if}
												{/each}
											</div>
										{/if}

										{#if (detailQuestion as any).prompt?.en?.rePhrasedQuestionImage?.length}
											<div class="mt-2">
												<div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--page-text-muted)]">Rephrased image</div>
												<div class="grid grid-cols-2 gap-2.5">
													{#each (detailQuestion as any).prompt.en.rePhrasedQuestionImage as img, imgIdx (`rq-${detailQuestion._id}-${imgIdx}`)}
														{@const src = imageSrc(img as ImageLike)}
														{#if src}
															<img {src} alt={imageAlt(img as ImageLike)} class="max-h-60 w-full rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain shadow-sm" loading="lazy" />
														{/if}
													{/each}
												</div>
											</div>
										{/if}
									</div>

									{#if (detailQuestion as any).paperId}
										<div class="mb-5">
											<div
												class="inline-flex rounded-md border border-[var(--page-link)]/10 bg-[var(--page-link)]/5 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-[var(--page-link)]"
											>
												{(detailQuestion as any).paperId}
											</div>
										</div>
									{/if}

									{#if detailQuestion.prompt?.en?.options?.length}
										<div
											class="mb-5 grid grid-cols-1 md:grid-cols-2 gap-2.5"
										>
											{#each detailQuestion.prompt.en.options as option (option.identifier)}
												{@const isSelected =
													selectedOption ===
													option.identifier}
												{@const correctData = (detailQuestion as any).correct}
												{@const questionKind = (detailQuestion as any).kind}
												{@const isCorrectData = 
													questionKind === 'MCQ' || questionKind === 'MSQ' || questionKind === 'TRUE_FALSE'
														? correctData?.identifiers?.includes(option.identifier)
														: false}
												{@const showAsCorrect =
													isAnswerChecked &&
													isCorrectData}
												{@const showAsWrong =
													isAnswerChecked &&
													isSelected &&
													!isCorrectData}

												<button
													type="button"
													class="group relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 {showAsCorrect
														? 'border-semantic-success bg-semantic-success/5 shadow-[0_0_15px_rgba(22,163,74,0.1)]'
														: showAsWrong
															? 'border-semantic-error bg-semantic-error/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
															: isSelected
																? 'border-[var(--page-link)] bg-[var(--page-link)]/5 ring-1 ring-[var(--page-link)]'
																: 'border-[var(--sh-exam-card-border)] bg-[var(--page-bg)]/40 hover:border-[var(--page-link)]/50 hover:bg-[var(--page-bg)]'}"
													disabled={isAnswerChecked}
													onclick={() =>
														!isAnswerChecked &&
														(selectedOption =
															option.identifier)}
												>
													<span
														class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold {showAsCorrect
															? 'border-semantic-success bg-semantic-success text-white'
															: showAsWrong
																? 'border-semantic-error bg-semantic-error text-white'
																: isSelected
																	? 'border-[var(--page-link)] bg-[var(--page-link)] text-white'
																	: 'border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-[var(--page-link)] group-hover:bg-[var(--page-link)]/20'}"
													>
														{showAsCorrect
															? "✓"
															: showAsWrong
																? "✕"
																: option.identifier}
													</span>
													<div
														class="min-w-0 flex-1 break-words"
													>
														<MathText
															content={option.content}
														/>
														{#if option.images?.length}
															<div
																class="mt-3 flex flex-wrap gap-2"
															>
																{#each option.images as img, imgIdx (`opt-${detailQuestion._id}-${option.identifier}-${imgIdx}`)}
																	{@const src =
																		imageSrc(
																			img as ImageLike,
																		)}
																	{#if src}
																		<img
																			{src}
																			alt={imageAlt(
																				img as ImageLike,
																			)}
																			class="max-h-32 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-bg)] object-contain shadow-sm"
																			loading="lazy"
																		/>
																	{/if}
																{/each}
															</div>
														{/if}

														{#if (option as any).rePhrasedOptionImage?.length}
															<div class="mt-2">
																<div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--page-text-muted)]">Rephrased image</div>
																<div class="flex flex-wrap gap-2">
																	{#each (option as any).rePhrasedOptionImage as img, imgIdx (`ropt-${detailQuestion._id}-${option.identifier}-${imgIdx}`)}
																		{@const src = imageSrc(img as ImageLike)}
																		{#if src}
																			<img {src} alt={imageAlt(img as ImageLike)} class="max-h-32 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-bg)] object-contain shadow-sm" loading="lazy" />
																		{/if}
																	{/each}
																</div>
															</div>
														{/if}
													</div>
												</button>
											{/each}
										</div>
									{:else if (detailQuestion as any).kind === 'INTEGER'}
										<div class="mb-6">
											<label
												class="block text-sm font-semibold text-[var(--page-text)] mb-3"
												for="integerAnswer"
											>
												Enter your answer (Integer)
											</label>
											<input
												type="text"
												id="integerAnswer"
												value={integerAnswer !== null ? String(integerAnswer) : ''}
												disabled={isAnswerChecked}
												oninput={(e) => {
													const target = e.target as HTMLInputElement;
													const value = target.value.replace(/[^0-9-]/g, '');
													target.value = value;
													integerAnswer = value ? parseInt(value) : null;
												}}
												class="w-full max-w-md rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-[1.05rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-2 focus:ring-[var(--page-link)]/20 transition disabled:opacity-60"
												placeholder="Enter integer value"
											/>
										</div>
									{:else if (detailQuestion as any).kind === 'FILL_BLANK'}
										<div class="mb-6">
											<div
												class="block text-sm font-semibold text-[var(--page-text)] mb-3"
											>
												Fill in the blank(s)
											</div>
											<div class="space-y-3">
												{#each Array(Math.max(1, (detailQuestion as any).correct?.fills?.length || 1)) as _, idx}
													<input
														type="text"
														value={fillBlankAnswers[idx] || ''}
														oninput={(e) => {
															const target = e.target as HTMLInputElement;
															fillBlankAnswers[idx] = target.value;
														}}
														disabled={isAnswerChecked}
														class="w-full max-w-md rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-[1.05rem] text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-2 focus:ring-[var(--page-link)]/20 transition disabled:opacity-60"
														placeholder="Answer {idx + 1}"
													/>
												{/each}
											</div>
										</div>
									{/if}

									{#if isAnswerChecked}
										{#if (detailQuestion as any).kind === 'INTEGER'}
											<div
												class="mb-5 rounded-xl border border-[var(--page-link)]/20 bg-[var(--page-link)]/5 p-3.5"
											>
												<div
													class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--page-link)]"
												>
													<svg
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<path
															d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
														/>
													</svg>
													Correct Answer
												</div>
												<div
													class="text-[1.1rem] font-semibold text-[var(--page-text)]"
												>
													{(detailQuestion as any).correct?.integer ?? 'N/A'}
												</div>
												{#if integerAnswer !== null}
													<div class="mt-3 text-sm">
														<span class="text-[var(--page-text-muted)]">Your answer:</span>
														<span class="ml-2 font-semibold {integerAnswer === (detailQuestion as any).correct?.integer ? 'text-semantic-success' : 'text-semantic-error'}">
															{integerAnswer}
														</span>
													</div>
												{/if}
											</div>
										{:else if (detailQuestion as any).kind === 'FILL_BLANK'}
											<div
												class="mb-5 rounded-xl border border-[var(--page-link)]/20 bg-[var(--page-link)]/5 p-3.5"
											>
												<div
													class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--page-link)]"
												>
													<svg
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<path
															d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
														/>
													</svg>
													Correct Answer(s)
												</div>
												<div
													class="space-y-2 text-[1rem] text-[var(--page-text)]"
												>
													{#each (detailQuestion as any).correct?.fills || [] as fill, idx}
														<div class="flex items-center gap-3">
															<span class="font-semibold text-[var(--page-text-muted)]">{idx + 1}.</span>
															<span class="font-semibold">{fill}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if detailQuestion.prompt?.en?.explanation}
											<div
												class="mb-5 rounded-xl border border-[var(--page-link)]/20 bg-[var(--page-link)]/5 p-3.5 animate-in fade-in slide-in-from-bottom-2"
											>
												<div
													class="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--page-link)]"
												>
													<svg
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<path
															d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
														/>
													</svg>
													Exam Flow Solution
												</div>
												<div
													class="text-[0.95rem] leading-relaxed text-[var(--page-text)]"
												>
													<MathText
														content={detailQuestion.prompt.en.explanation}
													/>

													{#if detailQuestion.prompt.en.explanationImages?.length}
														<div
															class="mt-4 flex flex-wrap gap-3"
														>
															{#each detailQuestion.prompt.en.explanationImages as img, imgIdx (`exp-${detailQuestion._id}-${imgIdx}`)}
																{@const src =
																	imageSrc(
																		img as ImageLike,
																	)}
																{#if src}
																	<img
																		{src}
																		alt={imageAlt(
																			img as ImageLike,
																		)}
																		class="max-h-48 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																		loading="lazy"
																	/>
																{/if}
															{/each}
														</div>
													{/if}

													{#if detailQuestion.prompt.en.rePhrasedExplanation}
														<div class="mt-4 border-t border-[var(--page-link)]/15 pt-4">
															<div class="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--page-text-muted)]">
																Re-phrased explanation
															</div>
															<MathText
																content={detailQuestion.prompt.en.rePhrasedExplanation}
															/>
															
															{#if detailQuestion.prompt.en.rePhrasedImage?.length}
																<div
																	class="mt-4 flex flex-wrap gap-3"
																>
																	{#each detailQuestion.prompt.en.rePhrasedImage as img, imgIdx (`re-exp-${detailQuestion._id}-${imgIdx}`)}
																		{@const src =
																			imageSrc(
																				img as ImageLike,
																			)}
																		{#if src}
																			<img
																				{src}
																				alt={imageAlt(
																					img as ImageLike,
																				)}
																				class="max-h-48 max-w-full rounded-md border border-[var(--page-card-border)] bg-[var(--page-card-bg)] object-contain"
																				loading="lazy"
																			/>
																		{/if}
																	{/each}
																</div>
															{/if}
														</div>
													{/if}
												</div>
											</div>
										{/if}
									{/if}
									</div> <!-- end scrollable content -->

									<div
										class="shrink-0 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sh-exam-card-border)] pt-3"
									>
										<button
											type="button"
											class="min-w-[100px] rounded-lg border border-[var(--page-link)]/50 bg-[var(--page-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--page-link)] transition hover:bg-[var(--page-link)]/10 disabled:opacity-40 disabled:hover:bg-[var(--page-bg)]"
											disabled={!canGoDetailedPrev}
											onclick={goDetailedPrev}
										>
											Previous
										</button>

										<button
											type="button"
											class="min-w-[180px] rounded-lg bg-[var(--page-link)] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--page-link)]/20 transition hover:bg-[var(--page-link-hover)] hover:shadow-lg disabled:opacity-50"
											onclick={() => {
												if (!isAnswerChecked) {
													isAnswerChecked = true;
												}
											}}
											disabled={isAnswerChecked}
										>
											Check Answer
										</button>

										<button
											type="button"
											class="min-w-[100px] rounded-lg border border-[var(--page-link)]/50 bg-[var(--page-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--page-link)] transition hover:bg-[var(--page-link)]/10 disabled:opacity-40 disabled:hover:bg-[var(--page-bg)]"
											disabled={!canGoDetailedNext}
											onclick={goDetailedNext}
										>
											Next
										</button>
									</div>
									</div> <!-- end flex col wrapper -->
								{/if}
							</div>
						</div>
					{/if}
				{/if}
			</div>
		</main>
	</div>
</div>

<!-- ── Toast notification ── -->
{#if toastMsg}
<div class="toast-wrap {toastType}" role="alert" aria-live="polite">
	{#if toastType === "success"}
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
	{:else}
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
	{/if}
	<span>{toastMsg}</span>
	<button onclick={() => (toastMsg = null)} aria-label="Dismiss">
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
	</button>
</div>
{/if}

<!-- ── Report Modal ── -->
{#if reportModalOpen}
<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
	<div 
		class="fixed inset-0 bg-black/60 backdrop-blur-sm" 
		role="button"
		tabindex="0"
		onclick={closeReportModal}
		onkeydown={(e) => e.key === 'Escape' ? closeReportModal() : null}
	></div>
	<div class="relative w-full max-w-md bg-[var(--page-bg)] border border-[var(--page-card-border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
		<div class="px-6 py-4 border-b border-[var(--page-card-border)] bg-[var(--page-card-bg)]/50">
			<h3 class="text-lg font-bold text-[var(--page-text)] flex items-center gap-2">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-semantic-error">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="8" x2="12" y2="12"></line>
					<line x1="12" y1="16" x2="12.01" y2="16"></line>
				</svg>
				Report Question
			</h3>
		</div>
		
		<div class="p-6 space-y-4">
			<div>
				<label class="block text-sm font-semibold text-[var(--page-text)] mb-2" for="reportReason">
					Reason for reporting
				</label>
				<div class="relative" bind:this={reportReasonDropdownRef}>
					<button
						type="button"
						id="reportReason"
						class="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-left text-sm text-[var(--page-text)] transition hover:border-[var(--page-link)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)]"
						aria-haspopup="listbox"
						aria-expanded={reportReasonDropdownOpen}
						onclick={() => (reportReasonDropdownOpen = !reportReasonDropdownOpen)}
					>
						<span class="truncate">
							{reportReasonOptions.find((option) => option.value === reportReason)?.label ?? "Select reason"}
						</span>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="shrink-0 text-[var(--page-text-muted)] transition-transform {reportReasonDropdownOpen ? 'rotate-180' : ''}"
							aria-hidden="true"
						>
							<path d="M6 9l6 6 6-6"></path>
						</svg>
					</button>
					{#if reportReasonDropdownOpen}
						<div class="absolute left-0 right-0 z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] shadow-xl">
							<ul role="listbox" aria-labelledby="reportReason" class="py-1">
								{#each reportReasonOptions as option (option.value)}
									<li>
										<button
											type="button"
											role="option"
											aria-selected={reportReason === option.value}
											class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition {reportReason === option.value ? 'bg-[var(--page-link)]/12 text-[var(--page-link)]' : 'text-[var(--page-text)] hover:bg-[var(--page-card-bg)]/70'}"
											onclick={() => selectReportReason(option.value)}
										>
											<span class="truncate">{option.label}</span>
											{#if reportReason === option.value}
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="shrink-0">
													<path d="M20 6L9 17l-5-5"></path>
												</svg>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
			
			<div>
				<label class="block text-sm font-semibold text-[var(--page-text)] mb-2" for="reportMessage">
					Description (optional)
				</label>
				<textarea 
					id="reportMessage"
					bind:value={reportMessage}
					placeholder="Provide more details about the issue..."
					rows="4"
					class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:ring-1 focus:ring-[var(--page-link)] transition resize-none"
				></textarea>
			</div>
		</div>

		<div class="px-6 py-4 border-t border-[var(--page-card-border)] bg-[var(--page-card-bg)]/30 flex items-center justify-end gap-3">
			<button 
				type="button" 
				class="px-4 py-2 text-sm font-semibold text-[var(--page-text-muted)] hover:text-[var(--page-text)] transition"
				onclick={closeReportModal}
				disabled={isSubmittingReport}
			>
				Cancel
			</button>
			<button 
				type="button" 
				class="px-6 py-2 bg-semantic-error text-white text-sm font-bold rounded-lg shadow-lg shadow-semantic-error/20 hover:bg-semantic-error/90 transition disabled:opacity-50"
				onclick={handleReportSubmit}
				disabled={isSubmittingReport}
			>
				{#if isSubmittingReport}
					Submitting...
				{:else}
					Submit Report
				{/if}
			</button>
		</div>
	</div>
</div>
{/if}

<style>
	.toast-wrap {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
		box-shadow: 0 8px 30px rgba(0,0,0,0.2);
		animation: toast-in 0.25s ease;
		max-width: 360px;
	}
	.toast-wrap.success { background: #10b981; color: #fff; }
	.toast-wrap.error   { background: #ef4444; color: #fff; }
	.toast-wrap button  { background: none; border: none; color: inherit; cursor: pointer; opacity: 0.8; padding: 0; display: flex; }
	.toast-wrap button:hover { opacity: 1; }
	.toast-wrap span { flex: 1; }
	@keyframes toast-in {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* Custom Scrollbar */
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: var(--sb-border-color);
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: var(--page-link);
	}
</style>
