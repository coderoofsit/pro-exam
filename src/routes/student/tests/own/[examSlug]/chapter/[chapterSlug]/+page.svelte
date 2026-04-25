<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import { questionPromptEnContent } from "$lib/api/questions";
  import { fetchTopicsByChapterSlug, type TopicRow } from "$lib/api/topics";
  import Pagination from "$lib/components/Pagination.svelte";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let { data }: { data: PageData } = $props();

  let topicOptions = $state<TopicRow[]>([]);
  let topicsLoading = $state(false);
  let selectedTopicSlug = $state<string[]>([]);
  let selectedKind = $state<string[]>([]);
  let selectedDifficulty = $state<string[]>([]);
  let filterDrawerOpen = $state(false);
  // pending = what's in the drawer before Apply
  let pendingTopic = $state<string[]>([]);
  let pendingKind = $state<string[]>([]);
  let pendingDifficulty = $state<string[]>([]);
  let topicsLoadedForSlug = $state<string | null>(null);
  let topicsAbort: AbortController | null = null;

  $effect(() => {
    if (!browser) return;
    const slug = data.chapterSlug;
    if (!slug) return;
    if (topicsLoadedForSlug === slug) return;

    // sync filters from URL
    const params = new URLSearchParams(window.location.search);
    selectedTopicSlug = params.get("topic") ? params.get("topic")!.split(",") : [];
    selectedKind = params.get("kind") ? params.get("kind")!.split(",") : [];
    selectedDifficulty = params.get("difficulty") ? params.get("difficulty")!.split(",") : [];

    topicsLoadedForSlug = slug;
    // selectedTopicSlug = []; // FIXED: Don't reset selected topics from URL
    topicOptions = [];
    topicsAbort?.abort();
    topicsAbort = new AbortController();
    const signal = topicsAbort.signal;
    topicsLoading = true;

    void fetchTopicsByChapterSlug(slug, fetch, { signal })
      .then((r) => {
        if (signal.aborted) return;
        if (topicsLoadedForSlug !== slug) return;
        if (r.success && r.data) {
  const unique = new Map<string, TopicRow>();

  for (const t of r.data) {
    // use slug (better) or fallback to _id
    const key = t.slug || t._id;
    if (!unique.has(key)) {
      unique.set(key, t);
    }
  }

  topicOptions = Array.from(unique.values());
}
      })
      .catch((e) => {
        if (signal.aborted) return;
        console.error("[own-test chapter topics]", e);
      })
      .finally(() => {
        if (signal.aborted) return;
        if (topicsLoadedForSlug === slug) topicsLoading = false;
      });
  });

  type Question = (typeof data.questions)[number];
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
    questionText?: string;
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
          chapterId: String(r?.chapterId ?? ""),
          chapterGroupId: String(r?.chapterGroupId ?? "").trim(),
          questionText: String(r?.questionText ?? "").trim()
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

  function toggleQuestion(q: Question) {
    const id = String(q?._id ?? '');
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
    selectedRows = [
      ...selectedRows,
      {
        id,
        subjectId: resolvedSubjectId,
        chapterId: resolvedChapterId,
        chapterGroupId: resolvedChapterGroupId,
        questionText: questionPreview(q)
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
    return `/student/tests/own/${encodeURIComponent(data.examSlug)}/chapter/${encodeURIComponent(data.chapterSlug)}?${params.toString()}`;
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

</script>

<svelte:head>
  <title>{title} — Manual test · Exam Abhyas</title>
</svelte:head>

<div class="own-test-page own-test-chapter-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:py-5">
    <div class="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        {#if data.paginationMeta}
          <p class="text-sm text-[var(--own-muted)]">
            {data.paginationMeta.total} questions • Page {data.safePage} of {data.paginationMeta.lastPage}
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
            window.history.back();
          }}
        >
          ← Resume test creation
        </button>
      </div>
    </div>

    <div class="mb-4">
      

      {#if filterDrawerOpen}
        <div class="mt-3 grid gap-4 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] p-4">
          <div>
            <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Difficulty</div>
            <div class="flex flex-wrap gap-2.5">
              {#each ["easy", "medium", "hard"] as diff}
                <button
                  type="button"
                  onclick={() => togglePendingDifficulty(diff)}
                  class="rounded-lg border px-3 py-1.5 text-xs font-medium transition {pendingDifficulty.includes(diff) ? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/60'}"
                >
                  {diff}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Type</div>
            <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {#each ["MCQ", "MSQ", "TRUE_FALSE", "INTEGER", "FILL_BLANK", "COMPREHENSION_PASSAGE"] as k}
                <button
                  type="button"
                  onclick={() => togglePendingKind(k)}
                  class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {pendingKind.includes(k) ? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/60'}"
                >
                  {k}
                </button>
              {/each}
            </div>
          </div>

          {#if topicOptions.length > 0}
            <div>
              <div class="mb-3 text-sm font-semibold text-[var(--page-text)]">Topic</div>
              {#if topicsLoading}
                <div class="text-xs text-[var(--page-text-muted)]">Loading...</div>
              {:else}
                <div class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onclick={() => (pendingTopic = [])}
                    class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {pendingTopic.length === 0 ? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/60'}"
                  >
                    All Topics
                  </button>
                  {#each topicOptions as t (t._id)}
                    <button
                      type="button"
                      onclick={() => togglePendingTopic(t.slug)}
                      class="rounded-xl border px-3 py-2 text-left text-xs font-medium transition {pendingTopic.includes(t.slug) ? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]' : 'border-[var(--sh-exam-card-border)] bg-[var(--sb-bg-from)] text-[var(--sb-nav-text)] hover:border-[var(--page-link)]/60'}"
                    >
                      {t.name?.en ?? t.slug}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          <div class="flex items-center gap-3 border-t border-[var(--sh-exam-card-border)] pt-4">
            <button type="button" class="flex-1 rounded-xl border border-[var(--sh-exam-card-border)] px-3 py-2 text-sm font-medium text-[var(--sb-nav-text)] transition hover:border-[var(--page-link)] hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--page-link)]" onclick={clearFilters}>Clear</button>
            <button type="button" class="flex-1 rounded-xl bg-[var(--page-link)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--page-link-hover)]" onclick={applyFilters}>Apply</button>
          </div>
        </div>
      {/if}
    </div>

    {#if data.message}
      <div class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]">
        {data.message}
      </div>
    {:else if data.questions.length === 0}
      <div class="rounded-2xl border border-[var(--page-link)]/35 bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]">
        No questions found.
      </div>
    {:else}
      <div class="flex flex-col gap-3 pb-24">
        {#each data.questions as q, index (q._id)}
          <button
            type="button"
            class="rounded-xl border border-[var(--page-link)]/35 bg-[var(--page-card-bg)] px-4 py-3.5 text-left transition hover:border-[var(--page-link)]/70"
            onclick={() => toggleQuestion(q)}
          >
            <div class="flex gap-3">
              <!-- Center 18px checkbox in the first line box: line-height 1.8 × 1.02rem -->
              <span class="flex shrink-0 items-center self-start pt-[calc((1.836rem-18px)/2)]">
                <label class="own-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q._id)}
                    onchange={() => toggleQuestion(q)}
                    aria-label="Select question"
                  />
                  <span class="own-check__visual" data-own-accent="0"></span>
                </label>
              </span>

              <div class="min-w-0 flex-1">
                <div class="text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
                  <span class="mr-2 inline font-medium text-[var(--page-text-muted)]">
                    {(data.safePage - 1) * (data.paginationMeta?.limit ?? 25) + index + 1}.
                  </span>
                  <MathText content={questionPromptEnContent(q)} />
                </div>
                {#if promptImages(q).length > 0}
                  <div class="mt-3 grid grid-cols-2 gap-2">
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
            </div>
          </button>
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
