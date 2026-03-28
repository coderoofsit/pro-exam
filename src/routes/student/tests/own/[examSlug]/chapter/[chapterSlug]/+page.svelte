<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import type { PageData } from "./$types";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let { data }: { data: PageData } = $props();

  type Question = (typeof data.questions)[number];

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

      // Back-compat: old format was string[]
      if (parsed.every((x) => typeof x === "string")) {
        const ids = (parsed as string[]).filter(Boolean);
        selectedRows = ids.map((id) => ({ id, chapterId: "" }));
        selectedIds = new Set(ids);
        return;
      }

      // New format: { id, chapterId }[]
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

</script>

<svelte:head>
  <title>{title} — Manual test · ExamFlow</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <p class="text-sm text-[var(--own-muted)]">Exam · {data.examSlug}</p>
        <h1 class="own-heading-xl mt-2">{title}</h1>
        {#if data.paginationMeta}
          <p class="mt-2 text-sm text-[var(--own-muted)]">
            {data.paginationMeta.total} questions • Page {data.safePage} of {data.paginationMeta.lastPage}
          </p>
        {/if}
      </div>

      <button
        type="button"
        class="rounded-lg border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-2 text-sm text-[var(--page-text-muted)] transition hover:bg-[var(--page-bg)] hover:text-[var(--page-text)]"
        onclick={() => goto(`/student/tests/own/${encodeURIComponent(data.examSlug)}?mode=manual`)}
      >
        Back
      </button>
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
                  <MathText content={q.prompt.en.content} />
                </div>
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
