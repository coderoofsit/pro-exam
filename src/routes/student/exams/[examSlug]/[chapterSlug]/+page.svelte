<script lang="ts">
  import MathText from "$lib/components/MathText.svelte";

  type QuestionOption = {
    identifier: string;
    content: string;
    images?: string[];
  };

  type QuestionPrompt = {
    content: string;
    images?: string[];
    options?: QuestionOption[];
    explanation?: string;
    explanationImages?: string[];
  };

  type Question = {
    _id: string;
    kind: string;
    difficulty: string;
    prompt: {
      en: QuestionPrompt;
    };
  };

  let { data } = $props<{
    data: {
      chapterId: string;
      examSlug: string;
      chapterSlug: string;
      message: string;
      total: number;
      currentPage: number;
      lastPage: number;
      limit: number;
      questions: Question[];
    };
  }>();

  const buildPageLink = (page: number) => `/student/exams/${data.examSlug}/${data.chapterSlug}?page=${page}`;

  const paginationWindow = 2;
  const startPage = Math.max(1, data.currentPage - paginationWindow);
  const endPage = Math.min(data.lastPage, data.currentPage + paginationWindow);
  const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  const difficultyConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    easy:   { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400" },
    medium: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/25",   dot: "bg-amber-400" },
    hard:   { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/25",     dot: "bg-rose-400" },
  };

  const getDifficultyStyle = (difficulty: string) =>
    difficultyConfig[difficulty.toLowerCase()] ?? difficultyConfig.medium;

  const kindConfig: Record<string, { bg: string; text: string; border: string }> = {
    mcq:  { bg: "bg-sky-500/10",    text: "text-sky-300",    border: "border-sky-500/25" },
    msq:  { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/25" },
    nat:  { bg: "bg-cyan-500/10",   text: "text-cyan-300",   border: "border-cyan-500/25" },
    tf:   { bg: "bg-teal-500/10",   text: "text-teal-300",   border: "border-teal-500/25" },
  };

  const getKindStyle = (kind: string) =>
    kindConfig[kind.toLowerCase()] ?? { bg: "bg-slate-500/10", text: "text-slate-300", border: "border-slate-500/25" };
</script>

<svelte:head>
  <title>Questions — Page {data.currentPage}</title>
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
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
  .question-card {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .question-card:hover {
    border-color: rgb(99 102 241 / 0.35);
    box-shadow: 0 0 0 1px rgb(99 102 241 / 0.1), 0 4px 24px rgb(0 0 0 / 0.25);
  }
  .page-link-active {
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-color: transparent;
    color: white;
    box-shadow: 0 2px 8px rgb(99 102 241 / 0.4);
  }
</style>

<div class="min-h-screen bg-[#080c14] text-slate-100" style="font-family: 'Inter var', 'Inter', system-ui, sans-serif;">
  <div class="border-b border-slate-800/60 bg-[#0b1120]/80 backdrop-blur-sm sticky top-0 z-10">
    <div class="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between">
      <a
        class="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        href={`/student/exams/${data.examSlug}/chapters`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Chapters
      </a>
      <div class="flex items-center gap-4 text-xs text-slate-500">
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          {data.total} questions
        </span>
        <span class="text-slate-700">|</span>
        <span>Page {data.currentPage} of {data.lastPage}</span>
      </div>
    </div>
  </div>

  <div class="mx-auto max-w-4xl px-5 py-10">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-50 mb-1">Questions</h1>
      <p class="text-sm text-slate-500">{data.message}</p>
    </div>

    {#if data.questions.length === 0}
      <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-500">
        <svg class="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No questions found.
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        {#each data.questions as question, index}
          {@const qNumber = (data.currentPage - 1) * data.limit + index + 1}
          {@const diffStyle = getDifficultyStyle(question.difficulty)}
          {@const kindStyle = getKindStyle(question.kind)}

          <div class="question-card rounded-2xl border border-slate-800/80 bg-[#0d1526]/90 overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-slate-600 bg-slate-800/60 rounded-md px-2 py-1">
                  Q{qNumber}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-md border {kindStyle.border} {kindStyle.bg} px-2.5 py-1 text-xs font-semibold uppercase tracking-widest {kindStyle.text}">
                  {question.kind}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-md border {diffStyle.border} {diffStyle.bg} px-2.5 py-1 text-xs font-medium {diffStyle.text}">
                  <span class="w-1.5 h-1.5 rounded-full {diffStyle.dot}"></span>
                  {question.difficulty}
                </span>
              </div>
            </div>

            <div class="px-6 py-5">
              <div class="math-content text-slate-100 text-[1.0625rem] leading-[1.85] overflow-x-auto">
                <MathText content={question.prompt.en.content} />
              </div>

              {#if question.prompt.en.options && question.prompt.en.options.length > 0}
                <div class="mt-5 grid gap-2.5" style="grid-template-columns: 1fr;">
                  {#each question.prompt.en.options as option}
                    <div class="group flex items-start gap-3.5 rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3.5 hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all duration-150 cursor-default">
                      <span class="option-badge mt-0.5 flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-xs font-bold text-indigo-300 group-hover:bg-indigo-500/30 transition-colors">
                        {option.identifier}
                      </span>
                      <div class="math-content flex-1 overflow-x-auto text-slate-200 text-[1.0625rem] leading-[1.85]">
                        <MathText content={option.content} />
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              {#if question.prompt.en.explanation}
                <details class="mt-5 group">
                  <summary class="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 cursor-pointer select-none list-none transition-colors w-fit">
                    <svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Show explanation
                  </summary>
                  <div class="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-4 py-4">
                    <div class="math-content text-indigo-100/80 text-sm leading-[1.85] overflow-x-auto">
                      <MathText content={question.prompt.en.explanation} />
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
          <a class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all" href={buildPageLink(1)}>← First</a>
          <a class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all" href={buildPageLink(data.currentPage - 1)}>Prev</a>
        {/if}
        {#each visiblePages as pageNumber}
          <a
            class="rounded-lg border px-3.5 py-2 text-xs transition-all {pageNumber === data.currentPage ? 'page-link-active' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'}"
            href={buildPageLink(pageNumber)}
          >
            {pageNumber}
          </a>
        {/each}
        {#if data.currentPage < data.lastPage}
          <a class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all" href={buildPageLink(data.currentPage + 1)}>Next</a>
          <a class="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all" href={buildPageLink(data.lastPage)}>Last →</a>
        {/if}
      </div>
    {/if}
  </div>
</div>
