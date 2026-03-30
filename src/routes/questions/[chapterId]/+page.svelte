<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";
  import { questionPromptEnContent, type Question } from "$lib/api/questions";

  let { data } = $props<{
    data: {
      chapterId: string;
      message: string;
      total: number;
      currentPage: number;
      lastPage: number;
      limit: number;
      questions: Question[];
    };
  }>();

  const PAGINATION_WINDOW = 2;
  const questionsPageUrl = (page: number) => `/questions/${data.chapterId}?page=${page}`;
  const paginationStartPage = $derived(Math.max(1, data.currentPage - PAGINATION_WINDOW));
  const paginationEndPage = $derived(Math.min(data.lastPage, data.currentPage + PAGINATION_WINDOW));
  const visiblePageNumbers = $derived(
    Array.from({ length: paginationEndPage - paginationStartPage + 1 }, (_, i) => paginationStartPage + i)
  );

  function tagClassForDifficulty(d: string): string {
    const k = d?.toLowerCase();
    if (k === "easy") return "q-tag q-tag--easy";
    if (k === "hard") return "q-tag q-tag--hard";
    return "q-tag q-tag--medium";
  }

  function classForKind(k: string): string {
    const c = k?.toLowerCase();
    if (c === "mcq") return "q-kind q-kind--mcq";
    if (c === "msq") return "q-kind q-kind--msq";
    if (c === "nat") return "q-kind q-kind--nat";
    if (c === "tf") return "q-kind q-kind--tf";
    return "q-kind q-kind--default";
  }
</script>

<svelte:head>
  <title>Questions — Page {data.currentPage}</title>
  <meta name="description" content="Questions page rendered with SSR using SvelteKit" />
</svelte:head>

<style>
  :global(.math-inline) {
    display: inline !important;
  }
  :global(.katex-display) {
    display: block;
    margin: 0.75rem 0;
    overflow-x: auto;
    overflow-y: hidden;
  }
  :global(.katex) {
    font-size: 1.05em;
  }
  .math-content :global(mjx-container),
  .math-content :global(.MathJax),
  .math-content :global(.katex-html) {
    display: inline !important;
  }
  .math-content :global(p) {
    margin: 0;
    line-height: 2;
  }
  .option-badge {
    font-family: "SF Mono", "Fira Code", monospace;
  }
  .question-card {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
</style>

<div class="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)]" style="font-family: 'Inter var', 'Inter', system-ui, sans-serif;">
  <div
    class="sticky top-0 z-30 border-b border-[var(--page-card-border)] bg-[var(--page-card-bg)] shadow-sm"
  >
    <div class="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3">
      <a
        class="flex items-center gap-1.5 text-sm text-[var(--page-text-muted)] transition hover:text-[var(--page-link-hover)]"
        href="/"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Chapters
      </a>
      <div class="flex items-center gap-4 text-xs text-[var(--page-text-muted)]">
        <span class="flex items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-full bg-[var(--page-link)]"></span>
          {data.total} questions
        </span>
        <span class="text-[var(--page-card-border)]">|</span>
        <span>Page {data.currentPage} of {data.lastPage}</span>
      </div>
    </div>
  </div>

  <div class="mx-auto w-full max-w-4xl px-5 py-10">
    <div class="mb-8">
      <h1 class="mb-1 text-2xl font-semibold tracking-tight text-[var(--page-text)]">Questions</h1>
      <p class="text-sm text-[var(--page-text-muted)]">{data.message}</p>
    </div>

    {#if data.questions.length === 0}
      <div
        class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-12 text-center text-[var(--page-text-muted)]"
      >
        <svg class="mx-auto mb-3 h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No questions found.
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        {#each data.questions as question, index}
          {@const qNumber = (data.currentPage - 1) * data.limit + index + 1}

          <div
            class="question-card overflow-hidden rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)]"
          >
            <div
              class="flex items-center justify-between border-b border-[var(--page-card-border)] px-6 py-4"
            >
              <span
                class="rounded-md bg-[var(--page-bg)] px-2 py-1 font-mono text-xs text-[var(--page-text-muted)]"
              >
                Q{qNumber}
              </span>
              {#if question.kind || question.difficulty}
                <div class="flex items-center gap-2">
                  {#if question.kind}
                    <span class={classForKind(question.kind)}>{question.kind}</span>
                  {/if}
                  {#if question.difficulty}
                    <span class={tagClassForDifficulty(question.difficulty)}>
                      <span class="q-tag-dot"></span>
                      {question.difficulty}
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            <div class="px-6 py-5">
              <div
                class="math-content overflow-x-auto text-[1.0625rem] leading-[1.85] text-[var(--page-text)]"
              >
                <MathText content={questionPromptEnContent(question)} />
              </div>

              {#if question.prompt?.en?.options?.length}
                <div class="mt-5 grid gap-2.5">
                  {#each (question.prompt?.en?.options ?? []) as option}
                    <div
                      class="group flex items-start gap-3.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3.5 transition hover:border-[var(--page-link)]/35 hover:bg-[var(--page-bg)]"
                    >
                      <span
                        class="option-badge mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--page-link)]/30 bg-[var(--page-link)]/10 text-xs font-bold text-[var(--page-link)]"
                      >
                        {option.identifier}
                      </span>
                      <div
                        class="math-content flex-1 overflow-x-auto text-[1.0625rem] leading-[1.85] text-[var(--page-text)]"
                      >
                        <MathText content={option.content} />
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if question.prompt?.en?.explanation}
                <details class="group mt-5">
                  <summary
                    class="flex w-fit cursor-pointer list-none items-center gap-2 select-none text-sm font-medium text-[var(--page-text-muted)] hover:text-[var(--page-text)]"
                  >
                    <svg class="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Show explanation
                  </summary>
                  <div
                    class="mt-3 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-4"
                  >
                    <div
                      class="math-content overflow-x-auto text-sm leading-[1.85] text-[var(--page-text-muted)]"
                    >
                      <MathText content={question.prompt?.en?.explanation ?? ''} />
                    </div>
                  </div>
                </details>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="mt-10 flex flex-wrap items-center justify-center gap-1.5">
        {#if data.currentPage > 1}
          <a class="pagination-btn" href={questionsPageUrl(1)}>← First</a>
          <a class="pagination-btn" href={questionsPageUrl(data.currentPage - 1)}>Prev</a>
        {/if}
        {#each visiblePageNumbers as pageNumber}
          <a
            class="pagination-btn px-3.5 {pageNumber === data.currentPage ? 'page-link-active' : ''}"
            href={questionsPageUrl(pageNumber)}
          >
            {pageNumber}
          </a>
        {/each}
        {#if data.currentPage < data.lastPage}
          <a class="pagination-btn" href={questionsPageUrl(data.currentPage + 1)}>Next</a>
          <a class="pagination-btn" href={questionsPageUrl(data.lastPage)}>Last →</a>
        {/if}
      </div>
    {/if}
  </div>
</div>
