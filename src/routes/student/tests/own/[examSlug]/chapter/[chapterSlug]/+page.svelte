<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import { questionPromptEnContent } from "$lib/api/questions";
  import { fetchTopicsByChapterSlug, type TopicRow } from "$lib/api/topics";
  import Pagination from "$lib/components/Pagination.svelte";
  import Button from "$lib/components/Button.svelte";
  import QuestionListSkeleton from "$lib/components/skeletons/QuestionListSkeleton.svelte";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let {
    data,
    basePath = "/student",
  }: { data: PageData; basePath?: string } = $props();

  let topicOptions = $state<TopicRow[]>(data.topics ?? []);
  let topicsLoading = $state(false);
  let selectedTopicSlug = $state<string[]>([]);
  let selectedKind = $state<string[]>([]);
  let selectedDifficulty = $state<string[]>([]);
  let filterDrawerOpen = $state(false);
  // pending = what's in the drawer before Apply
  let pendingTopic = $state<string[]>([]);
  let pendingKind = $state<string[]>([]);
  let pendingDifficulty = $state<string[]>([]);

  let questions = $state<any[]>([]);
  let paginationMeta = $state<any>(null);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    isLoading = true;
    errorMessage = data.message;
    const questionsPromise = data.streamed?.questionsRes;
    if (!questionsPromise) {
      isLoading = false;
      if (!errorMessage) errorMessage = "Failed to load questions";
      questions = [];
      paginationMeta = null;
      return;
    }
    void questionsPromise.then((res) => {
      if (res) {
         questions = res.data ?? [];
         paginationMeta = { total: res.total, lastPage: res.lastPage, limit: res.limit };
      } else {
         errorMessage = 'Failed to load questions';
      }
      isLoading = false;
    }).catch((err) => {
      errorMessage = err.message || 'Failed to load questions';
      isLoading = false;
    });
  });

  $effect(() => {
    if (!browser) return;
    const params = new URLSearchParams(window.location.search);
    // Keep chapter-open URL topic from pre-selecting the filter UI.
    const shouldIgnoreInitialTopic =
      params.has("topic") && !params.has("page") && !params.has("kind") && !params.has("difficulty");
    selectedTopicSlug = shouldIgnoreInitialTopic
      ? []
      : (params.get("topic") ? params.get("topic")!.split(",") : []);
    selectedKind = params.get("kind") ? params.get("kind")!.split(",") : [];
    selectedDifficulty = params.get("difficulty") ? params.get("difficulty")!.split(",") : [];
  });

  type Question = any;
  type ImageLike = string | { url?: string; alt?: string; publicId?: string; version?: string };

  const title = $derived(data.chapter?.name?.en ?? data.chapterSlug);
  const examSlug = $derived(data.examSlug);
  const examId = $derived((data as any).examId ?? "");
  const boardId = $derived((data as any).boardId ?? "");
  const chapterId = $derived((data as any).chapterId ?? "");

  const selectionKey = $derived(`own-manual-selected::${examSlug}`);
  type ManualSelectedRow = {
    id: string;
    subjectId: string;
    chapterId: string;
    chapterGroupId: string;
    topicId?: string;
    topicSlug?: string;
    questionText?: string;
    questionContent?: string;
  };
  let selectedRows = $state<ManualSelectedRow[]>([]);
  let selectedIds = $state<Set<string>>(new Set());

  $effect(() => {
    if (!browser) return;
    try {
      const raw = sessionStorage.getItem(selectionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;

      if (parsed.every((x) => typeof x === "string")) {
        const ids = (parsed as string[]).filter(Boolean);
        selectedRows = ids.map((id) => ({
          id,
          subjectId: "",
          chapterId: "",
          chapterGroupId: ""
        }));
        selectedIds = new Set(ids);
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({
          id: String(r?.id ?? ""),
          subjectId: String(r?.subjectId ?? "").trim(),
          chapterId: String(r?.chapterId ?? "").trim() || String(r?.chapterGroupId ?? "").trim(),
          chapterGroupId: String(r?.chapterGroupId ?? "").trim(),
          topicId: String(r?.topicId ?? "").trim(),
          topicSlug: String(r?.topicSlug ?? "").trim(),
          questionText: String(r?.questionText ?? "").trim(),
          questionContent: String(r?.questionContent ?? r?.questionText ?? "").trim()
        }))
        .filter((r) => r.id);
      selectedRows = rows;
      selectedIds = new Set(rows.map((r) => r.id));
    } catch {}
  });

  $effect(() => {
    if (!browser) return;
    try {
      sessionStorage.setItem(selectionKey, JSON.stringify(selectedRows));
    } catch {}
  });

  function questionPreview(q: Question): string {
    const raw = questionPromptEnContent(q);
    return String(raw ?? '').replace(/\s+/g, ' ').trim();
  }

  function questionId(q: Question): string {
    return String((q as any)?._id ?? (q as any)?.id ?? "").trim();
  }

  function toggleQuestion(q: Question) {
    const id = questionId(q);
    if (!id) return;
    const exists = selectedIds.has(id);
    if (exists) {
      selectedRows = selectedRows.filter((r) => r.id !== id);
      selectedIds = new Set(selectedRows.map((r) => r.id));
      return;
    }

    const resolvedChapterId = String(chapterId ?? "").trim() || String(data.chapter?._id ?? "");
    const params = browser ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const subjectParam = String(params.get("subject") ?? "").trim();
    const unitsParam = String(params.get("units") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const resolvedSubjectId =
      String((q as any)?.subjectId?._id ?? (q as any)?.subjectId ?? "").trim() ||
      subjectParam;
    const resolvedChapterGroupId =
      String((q as any)?.chapterGroupId?._id ?? (q as any)?.chapterGroupId ?? "").trim() ||
      String(unitsParam[0] ?? "").trim();
    const topicParam = String(params.get("topic") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const resolvedTopicSlug =
      String((q as any)?.topicSlug ?? "").trim() ||
      String(topicParam[0] ?? "").trim();
    const resolvedTopicId = String((q as any)?.topicId?._id ?? (q as any)?.topicId ?? "").trim();
    selectedRows = [
      ...selectedRows,
      {
        id,
        subjectId: resolvedSubjectId,
        chapterId: resolvedChapterId,
        chapterGroupId: resolvedChapterGroupId,
        topicId: resolvedTopicId,
        topicSlug: resolvedTopicSlug,
        questionText: questionPreview(q),
        questionContent: String(questionPromptEnContent(q) ?? "").trim()
      }
    ];
    selectedIds = new Set(selectedRows.map((r) => r.id));
  }

  const selectedCount = $derived(selectedIds.size);
  const selectedCountInChapter = $derived.by(() => {
    const currentChapterId = String(chapterId ?? "").trim() || String(data.chapter?._id ?? "");
    if (!currentChapterId) return selectedCount;
    return selectedRows.filter((r) => String(r.chapterId).trim() === currentChapterId).length;
  });

  const questionsPageUrl = (p: number, opts?: { topic?: string[]; kind?: string[]; difficulty?: string[] }) => {
    const t = opts?.topic ?? selectedTopicSlug;
    const k = opts?.kind ?? selectedKind;
    const d = opts?.difficulty ?? selectedDifficulty;
    const params = new URLSearchParams({ mode: "manual", page: String(p), examId, boardId });
    if (t.length) params.set("topic", t.join(","));
    if (k.length) params.set("kind", k.join(","));
    if (d.length) params.set("difficulty", d.join(","));
    return `${basePath}/tests/own/${encodeURIComponent(data.examSlug)}/chapter/${encodeURIComponent(data.chapterSlug)}?${params.toString()}`;
  };

  function toggleFilterPanel() {
    if (!filterDrawerOpen) {
      pendingTopic = [...selectedTopicSlug];
      pendingKind = [...selectedKind];
      pendingDifficulty = [...selectedDifficulty];
    }
    filterDrawerOpen = !filterDrawerOpen;
  }

  function applyFilters() {
    selectedTopicSlug = [...pendingTopic];
    selectedKind = [...pendingKind];
    selectedDifficulty = [...pendingDifficulty];
    filterDrawerOpen = false;
    void goto(questionsPageUrl(1, { topic: pendingTopic, kind: pendingKind, difficulty: pendingDifficulty }));
  }

  function clearFilters() {
    pendingTopic = []; pendingKind = []; pendingDifficulty = [];
    selectedTopicSlug = []; selectedKind = []; selectedDifficulty = [];
    filterDrawerOpen = false;
    void goto(questionsPageUrl(1, { topic: [], kind: [], difficulty: [] }));
  }

  function togglePendingTopic(t: string) {
    pendingTopic = pendingTopic.includes(t)
      ? pendingTopic.filter(x => x !== t)
      : [...pendingTopic, t];
  }

  function togglePendingKind(k: string) {
    pendingKind = pendingKind.includes(k)
      ? pendingKind.filter(x => x !== k)
      : [...pendingKind, k];
  }

  function togglePendingDifficulty(d: string) {
    pendingDifficulty = pendingDifficulty.includes(d)
      ? pendingDifficulty.filter(x => x !== d)
      : [...pendingDifficulty, d];
  }

  function formatFilterLabel(value: string): string {
    return value
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => {
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  }

  const activeFilterCount = $derived(
    selectedTopicSlug.length + selectedKind.length + selectedDifficulty.length
  );

  function imageSrc(image: ImageLike): string {
    if (typeof image === "string") return image;
    return image?.url ?? "";
  }

  function imageAlt(image: ImageLike): string {
    if (typeof image === "string") return "";
    return image?.alt ?? "";
  }

  function promptImages(q: Question): ImageLike[] {
    const images = (q as any)?.prompt?.en?.images ?? [];
    return Array.isArray(images) ? images : [];
  }

  function resumeTestCreationUrl(): string {
    if (!browser) return `${basePath}/tests/own/${encodeURIComponent(data.examSlug)}?mode=manual`;
    const params = new URLSearchParams(window.location.search);
    const q = new URLSearchParams({ mode: "manual" });
    const subject = String(params.get("subject") ?? "").trim();
    const units = String(params.get("units") ?? "").trim();
    if (subject) q.set("subject", subject);
    if (units) q.set("units", units);
    return `${basePath}/tests/own/${encodeURIComponent(data.examSlug)}?${q.toString()}`;
  }

</script>

<svelte:head>
  <title>{title} — Manual test · Exam Abhyas</title>
</svelte:head>

<div class="own-test-page own-test-chapter-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:py-5">
    <div class="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        {#if paginationMeta}
          <p class="text-sm text-[var(--own-muted)]">
            {paginationMeta.total} questions • Page {data.safePage} of {paginationMeta.lastPage}
          </p>
        {/if}
        <p class="mt-1 text-xs text-[var(--page-text-muted)]">
          Chapter: {title} • Selected: {selectedCountInChapter}
        </p>
      </div>

      {#if data.paginationMeta && data.paginationMeta.lastPage > 1}
        <Pagination
          currentPage={data.safePage}
          totalPages={data.paginationMeta.lastPage}
          getHref={questionsPageUrl}
          keyPrefix="top-own-chapter"
        />
      {/if}

      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-[var(--page-link)]/45 bg-[var(--page-card-bg)] px-3 py-2 text-sm text-[var(--page-text-muted)] shadow-[var(--shadow-item)] transition hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:text-[var(--page-link)] hover:shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--page-link)_40%,transparent)]"
          onclick={toggleFilterPanel}
        >
          Filters{#if activeFilterCount > 0}<span class="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--page-link)] text-[10px] font-bold text-white">{activeFilterCount}</span>{/if}
        </button>
        <button
          type="button"
          class="rounded-lg border border-[var(--page-link)]/45 bg-[var(--page-card-bg)] px-3 py-2 text-sm text-[var(--page-text-muted)] shadow-[var(--shadow-item)] transition hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:text-[var(--page-link)] hover:shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--page-link)_40%,transparent)]"
          onclick={() => {
            if (!browser) return;
            void goto(resumeTestCreationUrl());
          }}
        >
          ← Resume test creation
        </button>
      </div>
    </div>

    <div class="mb-4">
      

      {#if filterDrawerOpen}
        <div class="mt-3 grid gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] p-3 sm:gap-4 sm:p-4">
          <div>
            <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Difficulty</div>
            <div class="flex flex-wrap gap-2.5">
              {#each ["easy", "medium", "hard"] as diff}
                <label class="flex max-w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] px-3 py-2 text-xs font-medium text-[var(--sb-nav-text)] transition hover:border-[var(--page-link)]/60">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] accent-[var(--page-link)]"
                    checked={pendingDifficulty.includes(diff)}
                    onchange={() => togglePendingDifficulty(diff)}
                  />
                  <span>{formatFilterLabel(diff)}</span>
                </label>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Type</div>
            <div class="flex flex-wrap gap-2.5">
              {#each ["MCQ", "MSQ", "TRUE_FALSE", "INTEGER", "FILL_BLANK", "COMPREHENSION_PASSAGE"] as k}
                <label class="flex max-w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] px-3 py-2 text-left text-xs font-medium text-[var(--sb-nav-text)] transition hover:border-[var(--page-link)]/60">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] accent-[var(--page-link)]"
                    checked={pendingKind.includes(k)}
                    onchange={() => togglePendingKind(k)}
                  />
                  <span>{formatFilterLabel(k)}</span>
                </label>
              {/each}
            </div>
          </div>

          {#if topicOptions.length > 0}
            <div>
              <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Topic</div>
              {#if topicsLoading}
                <div class="text-xs text-[var(--page-text-muted)]">Loading...</div>
              {:else}
                <div class="flex flex-wrap gap-2.5">
                  {#each topicOptions as t (t._id)}
                    <label class="flex max-w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] px-3 py-2 text-left text-xs font-medium text-[var(--sb-nav-text)] transition hover:border-[var(--page-link)]/60">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-[var(--sh-exam-card-border)] accent-[var(--page-link)]"
                        checked={pendingTopic.includes(t.slug)}
                        onchange={() => togglePendingTopic(t.slug)}
                      />
                      <span>{formatFilterLabel(t.name?.en ?? t.slug)}</span>
                    </label>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <div class="flex items-center justify-between gap-3 border-t border-[var(--sh-exam-card-border)] pt-3 sm:pt-4">
            <Button type="button" onClick={clearFilters} className="rounded-lg border border-[var(--sh-exam-card-border)] px-3 py-1.5 text-xs font-medium text-[var(--sb-nav-text)] transition hover:border-[var(--page-link)] hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--page-link)]">Clear</Button>
            <Button type="button" onClick={applyFilters} className="rounded-lg border border-[color-mix(in_srgb,var(--page-link)_38%,transparent)] bg-[color-mix(in_srgb,var(--page-link)_52%,var(--page-card-bg))] px-4 py-1.5 text-xs font-medium text-[var(--page-text)] transition hover:bg-[color-mix(in_srgb,var(--page-link)_64%,var(--page-card-bg))]">Apply</Button>
          </div>
        </div>
      {/if}
    </div>

    {#if isLoading}
      <QuestionListSkeleton />
    {:else if errorMessage}
      <div class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]">
        {errorMessage}
      </div>
    {:else if questions.length === 0}
      <div class="rounded-2xl border border-[var(--page-link)]/35 bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]">
        No questions found.
      </div>
    {:else}
      <div class="flex flex-col gap-3 pb-24">
        {#each questions as q, index (questionId(q))}
          <!-- Do not wrap the checkbox in <button>: interactive content inside a button is invalid HTML and breaks selection in browsers. -->
          <article
            class="rounded-2xl border border-[var(--own-question-border)] bg-[var(--own-question-bg)] p-4 text-left transition hover:border-[var(--own-question-hover-border)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--page-link)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--own-question-bg)]"
            tabindex="0"
            onclick={(e) => {
              const el = e.target as HTMLElement;
              if (el.closest("label.own-chapter-q-check") || el.closest('input[type="checkbox"]')) return;
              toggleQuestion(q);
            }}
            onkeydown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              toggleQuestion(q);
            }}
          >
            <!-- One row: checkbox, number, and stem share the same baseline (first line). -->
            <div class="flex min-w-0 flex-col gap-3">
              <div
                class="own-chapter-q-stem flex min-w-0 flex-wrap items-start gap-x-2 gap-y-2 text-base font-semibold leading-relaxed text-[var(--page-text)]"
              >
                <label class="own-check own-chapter-q-check shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(questionId(q))}
                    onchange={() => toggleQuestion(q)}
                    aria-label="Select question"
                  />
                  <span class="own-check__visual" data-own-accent="0"></span>
                </label>
                <span class="own-chapter-q-num shrink-0 font-medium tabular-nums text-[var(--page-text-muted)]">
                  {(data.safePage - 1) * (paginationMeta?.limit ?? 25) + index + 1}.
                </span>
                <span class="own-chapter-q-math min-w-0 flex-[1_1_12rem] basis-0">
                  <MathText content={questionPromptEnContent(q)} />
                </span>
              </div>
              {#if promptImages(q).length > 0}
                <div class="grid grid-cols-2 gap-2">
                    {#each promptImages(q) as img, imgIdx}
                      {@const src = imageSrc(img)}
                      {#if src}
                        <img
                          {src}
                          alt={imageAlt(img)}
                          class="max-h-48 w-full rounded-lg border border-[var(--page-link)]/30 object-contain"
                          loading="lazy"
                        />
                      {/if}
                    {/each}
                  </div>
                {/if}
            </div>
          </article>
        {/each}
      </div>

      {#if data.paginationMeta && data.paginationMeta.lastPage > 1}
        <Pagination
          currentPage={data.safePage}
          totalPages={data.paginationMeta.lastPage}
          getHref={questionsPageUrl}
          keyPrefix="bottom-own-chapter"
          className="mt-6"
        />
      {/if}

    {/if}
  </div>
</div>

<style>
  /* Keep check/number locked to first text line regardless of checked pseudo-mark. */
  .own-chapter-q-check {
    margin-top: 0.35rem;
  }
  .own-chapter-q-num {
    margin-top: 0.06rem;
  }
  /* Checkbox visual scales with row text but does not shift when checked. */
  .own-chapter-q-stem :global(.own-check__visual) {
    width: 1em;
    height: 1em;
    min-width: 1em;
    min-height: 1em;
  }
  /* MathText uses vertical-align:middle on SVG; middle skews the flex baseline row */
  .own-chapter-q-math :global(mjx-container) {
    vertical-align: baseline !important;
  }
  .own-chapter-q-math :global(mjx-container > svg) {
    vertical-align: baseline !important;
  }
  /* Some stems come wrapped in <p>, whose top margin causes per-question vertical drift. */
  .own-chapter-q-math :global(p) {
    margin-top: 0 !important;
  }
</style>