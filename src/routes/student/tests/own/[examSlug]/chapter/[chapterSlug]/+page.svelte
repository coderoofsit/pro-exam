<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import { questionPromptEnContent } from "$lib/api/questions";
  import { fetchTopicsByChapterSlug, type TopicRow } from "$lib/api/topics";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let { data }: { data: PageData } = $props();

  let topicOptions = $state<TopicRow[]>([]);
  let topicsLoading = $state(false);
  /** Empty string = "All" */
  let selectedTopicSlug = $state("");
  let topicsLoadedForSlug = $state<string | null>(null);
  let topicsAbort: AbortController | null = null;

  $effect(() => {
    if (!browser) return;
    const slug = data.chapterSlug;
    if (!slug) return;
    if (topicsLoadedForSlug === slug) return;

    topicsLoadedForSlug = slug;
    selectedTopicSlug = "";
    topicOptions = [];
    topicsAbort?.abort();
    topicsAbort = new AbortController();
    const signal = topicsAbort.signal;
    topicsLoading = true;

    void fetchTopicsByChapterSlug(slug, fetch, { signal })
      .then((r) => {
        if (signal.aborted) return;
        if (topicsLoadedForSlug !== slug) return;
        if (r.success && r.data) topicOptions = r.data;
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
  type ManualSelectedRow = { id: string; chapterId: string };
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
        selectedRows = ids.map((id) => ({ id, chapterId: "" }));
        selectedIds = new Set(ids);
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({ id: String(r?.id ?? ""), chapterId: String(r?.chapterId ?? "") }))
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

  function toggleQuestion(id: string) {
    const exists = selectedIds.has(id);
    if (exists) {
      selectedRows = selectedRows.filter((r) => r.id !== id);
      selectedIds = new Set(selectedRows.map((r) => r.id));
      return;
    }

    const resolvedChapterId = String(chapterId ?? "").trim() || String(data.chapter?._id ?? "");
    selectedRows = [...selectedRows, { id, chapterId: resolvedChapterId }];
    selectedIds = new Set(selectedRows.map((r) => r.id));
  }

  const selectedCount = $derived(selectedIds.size);

  const questionsPageUrl = (p: number) => {
    const params = new URLSearchParams({
      mode: "manual",
      page: String(p),
      examId,
      boardId
    });
    return `/student/tests/own/${encodeURIComponent(data.examSlug)}/chapter/${encodeURIComponent(
      data.chapterSlug
    )}?${params.toString()}`;
  };

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
  <title>{title} — Manual test · ExamFlow</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <p class="text-sm text-[var(--own-muted)]">Exam · {data.examSlug}</p>
        <h1 class="own-heading-xl mt-2">{title}</h1>
        {#if data.paginationMeta}
          <p class="mt-2 text-sm text-[var(--own-muted)]">
            {data.paginationMeta.total} questions • Page {data.safePage} of {data.paginationMeta.lastPage}
          </p>
        {/if}
      </div>

      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <label class="flex items-center gap-2 text-sm text-[var(--page-text-muted)]">
          <span class="sr-only">Topic</span>
          <select
            bind:value={selectedTopicSlug}
            aria-busy={topicsLoading}
            class="min-h-[2.5rem] min-w-[10rem] max-w-[min(100%,18rem)] rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-2 text-sm text-[var(--page-text)] outline-none transition hover:border-[var(--sh-exam-card-hover-border)] focus:border-[var(--accent-cta-pink)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent-cta-pink)_25%,transparent)]"
            aria-label="Filter by topic"
          >
            <option value="">All</option>
            {#each topicOptions as t (t._id)}
              <option value={t.slug}>{t.name?.en ?? t.slug}</option>
            {/each}
          </select>
        </label>
        <button
          type="button"
          class="rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-2 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
          onclick={() => goto(`/student/tests/own/${encodeURIComponent(data.examSlug)}?mode=manual`)}
        >
          Back
        </button>
      </div>
    </div>

    {#if data.message}
      <div class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]">
        {data.message}
      </div>
    {:else if data.questions.length === 0}
      <div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-10 text-center text-[var(--page-text-muted)]">
        No questions found.
      </div>
    {:else}
      <div class="flex flex-col gap-3 pb-24">
        {#each data.questions as q, index (q._id)}
          <button
            type="button"
            class="rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-4 py-3.5 text-left"
            onclick={() => toggleQuestion(q._id)}
          >
            <div class="flex items-start gap-3">
              <label class="own-check mt-0.5">
                <input
                  type="checkbox"
                  checked={selectedIds.has(q._id)}
                  onchange={() => toggleQuestion(q._id)}
                  aria-label="Select question"
                />
                <span class="own-check__visual" data-own-accent="0"></span>
              </label>

              <div class="min-w-0 flex-1">
                <div class="mb-1 text-xs font-medium text-[var(--page-text-muted)]">
                  Q{(data.safePage - 1) * (data.paginationMeta?.limit ?? 25) + index + 1}
                </div>
                <div class="text-[1.02rem] leading-[1.8] text-[var(--page-text)]">
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
                          class="max-h-48 w-full rounded-lg border border-[var(--page-card-border)] object-contain"
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
        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          {#if data.safePage > 1}
            <a class="pagination-btn" href={questionsPageUrl(1)}>← First</a>
            <a class="pagination-btn" href={questionsPageUrl(data.safePage - 1)}>Prev</a>
          {/if}
          <span class="text-xs text-[var(--page-text-muted)]">
            Page {data.safePage} / {data.paginationMeta.lastPage}
          </span>
          {#if data.safePage < data.paginationMeta.lastPage}
            <a class="pagination-btn" href={questionsPageUrl(data.safePage + 1)}>Next</a>
            <a class="pagination-btn" href={questionsPageUrl(data.paginationMeta.lastPage)}>Last →</a>
          {/if}
        </div>
      {/if}

    {/if}
  </div>
</div>
