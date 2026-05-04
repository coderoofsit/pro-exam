<script lang="ts">
  import type { TestAttemptSummary } from '$lib/api/testAttempts';

  type Props = {
    open: boolean;
    testName: string;
    summary: TestAttemptSummary | null;
    error: string | null;
    onclose: () => void;
  };

  let { open, testName, summary, error, onclose }: Props = $props();

  function labelEn(n: { en?: string; hi?: string } | undefined): string {
    if (!n) return '—';
    const t = (n.en ?? n.hi ?? '').trim();
    return t || '—';
  }

  function formatDurationMs(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '—';
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m <= 0) return `${sec}s`;
    return `${m}m ${sec}s`;
  }

  function pct(n: number): string {
    if (!Number.isFinite(n)) return '—';
    const rounded = Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : Math.round(n * 10) / 10;
    return `${rounded}%`;
  }

  const totalQs = $derived(
    summary
      ? summary.correctCount + summary.incorrectCount + summary.unattemptedCount
      : 0
  );
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ta-analysis-title"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && onclose()}
  >
    <div
      class="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] shadow-xl"
      style="background: var(--sh-exam-card-bg);"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Opaque bar: only the body below scrolls so summary cards never bleed under the title -->
      <div
        class="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--sh-exam-card-border)] px-5 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.25)]"
        style="background: color-mix(in srgb, var(--sh-exam-card-bg) 100%, #0a0c12);"
      >
        <div class="min-w-0">
          <h2 id="ta-analysis-title" class="text-lg font-bold text-[var(--sh-section-title)]">
            Test analysis
          </h2>
          <p class="mt-0.5 truncate text-sm font-medium text-[var(--sh-exam-card-title)]">{testName}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_88%,var(--sh-section-title))] px-3 py-1.5 text-xs font-semibold text-[var(--sh-ai-sub)] transition hover:opacity-90"
          onclick={onclose}
        >
          Close
        </button>
      </div>

      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin]"
        style="background: color-mix(in srgb, var(--sh-exam-card-arrow-bg) 12%, var(--sh-exam-card-bg));"
      >
        {#if error}
          <p class="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="alert">
            {error}
          </p>
        {:else if summary}
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Status</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">{summary.status}</p>
            </div>
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Submitted</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">
                {summary.submittedAt
                  ? new Date(summary.submittedAt).toLocaleString()
                  : '—'}
              </p>
            </div>
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Score</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">
                {summary.obtainedMarks} / {summary.totalMarks}
              </p>
            </div>
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Accuracy</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">{pct(summary.accuracy)}</p>
            </div>
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Time spent</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">
                {formatDurationMs(summary.totalTimeSpentMs)}
              </p>
            </div>
            <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] px-4 py-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">Questions</p>
              <p class="mt-1 text-sm font-semibold text-[var(--sh-section-title)]">
                {totalQs} total · {summary.correctCount} correct · {summary.incorrectCount} incorrect ·
                {summary.unattemptedCount} unattempted
              </p>
            </div>
          </div>

          <div class="mt-6 space-y-6">
            {#if summary.statsBreakdown?.bySubject?.length}
              <section>
                <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                  By subject
                </h3>
                <div class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                      <tr>
                        <th class="px-3 py-2">Subject</th>
                        <th class="px-3 py-2">Q</th>
                        <th class="px-3 py-2">Attempted</th>
                        <th class="px-3 py-2">Correct</th>
                        <th class="px-3 py-2">Wrong</th>
                        <th class="px-3 py-2">Score</th>
                        <th class="px-3 py-2">Acc</th>
                        <th class="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--sh-exam-card-border)] text-[var(--sh-exam-card-title)]">
                      {#each summary.statsBreakdown.bySubject as row, i (i)}
                        <tr>
                          <td class="px-3 py-2 font-medium">{labelEn(row.subjectId?.name)}</td>
                          <td class="px-3 py-2">{row.totalQuestions}</td>
                          <td class="px-3 py-2">{row.attemptedCount}</td>
                          <td class="px-3 py-2">{row.correctCount}</td>
                          <td class="px-3 py-2">{row.incorrectCount}</td>
                          <td class="px-3 py-2">{row.obtainedMarks} / {row.totalMarks}</td>
                          <td class="px-3 py-2">{pct(row.accuracy)}</td>
                          <td class="px-3 py-2 whitespace-nowrap">{formatDurationMs(row.timeSpentMs)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </section>
            {/if}

            {#if summary.statsBreakdown?.byKind?.length}
              <section>
                <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">By kind</h3>
                <div class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]">
                  <table class="w-full min-w-[480px] text-left text-sm">
                    <thead class="bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                      <tr>
                        <th class="px-3 py-2">Kind</th>
                        <th class="px-3 py-2">Q</th>
                        <th class="px-3 py-2">Attempted</th>
                        <th class="px-3 py-2">Correct</th>
                        <th class="px-3 py-2">Wrong</th>
                        <th class="px-3 py-2">Score</th>
                        <th class="px-3 py-2">Acc</th>
                        <th class="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--sh-exam-card-border)] text-[var(--sh-exam-card-title)]">
                      {#each summary.statsBreakdown.byKind as row (row.kind)}
                        <tr>
                          <td class="px-3 py-2 font-medium">{row.kind}</td>
                          <td class="px-3 py-2">{row.totalQuestions}</td>
                          <td class="px-3 py-2">{row.attemptedCount}</td>
                          <td class="px-3 py-2">{row.correctCount}</td>
                          <td class="px-3 py-2">{row.incorrectCount}</td>
                          <td class="px-3 py-2">{row.obtainedMarks} / {row.totalMarks}</td>
                          <td class="px-3 py-2">{pct(row.accuracy)}</td>
                          <td class="px-3 py-2 whitespace-nowrap">{formatDurationMs(row.timeSpentMs)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </section>
            {/if}

            {#if summary.statsBreakdown?.byChapterGroup?.length}
              <section>
                <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                  By chapter group
                </h3>
                <div class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                      <tr>
                        <th class="px-3 py-2">Group</th>
                        <th class="px-3 py-2">Q</th>
                        <th class="px-3 py-2">Attempted</th>
                        <th class="px-3 py-2">Correct</th>
                        <th class="px-3 py-2">Wrong</th>
                        <th class="px-3 py-2">Score</th>
                        <th class="px-3 py-2">Acc</th>
                        <th class="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--sh-exam-card-border)] text-[var(--sh-exam-card-title)]">
                      {#each summary.statsBreakdown.byChapterGroup as row, i (i)}
                        <tr>
                          <td class="px-3 py-2 font-medium">{labelEn(row.chapterGroupId?.name)}</td>
                          <td class="px-3 py-2">{row.totalQuestions}</td>
                          <td class="px-3 py-2">{row.attemptedCount}</td>
                          <td class="px-3 py-2">{row.correctCount}</td>
                          <td class="px-3 py-2">{row.incorrectCount}</td>
                          <td class="px-3 py-2">{row.obtainedMarks} / {row.totalMarks}</td>
                          <td class="px-3 py-2">{pct(row.accuracy)}</td>
                          <td class="px-3 py-2 whitespace-nowrap">{formatDurationMs(row.timeSpentMs)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </section>
            {/if}

            {#if summary.statsBreakdown?.byChapter?.length}
              <section>
                <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">By chapter</h3>
                <div class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)] text-[10px] font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                      <tr>
                        <th class="px-3 py-2">Chapter</th>
                        <th class="px-3 py-2">Q</th>
                        <th class="px-3 py-2">Attempted</th>
                        <th class="px-3 py-2">Correct</th>
                        <th class="px-3 py-2">Wrong</th>
                        <th class="px-3 py-2">Score</th>
                        <th class="px-3 py-2">Acc</th>
                        <th class="px-3 py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--sh-exam-card-border)] text-[var(--sh-exam-card-title)]">
                      {#each summary.statsBreakdown.byChapter as row, i (i)}
                        <tr>
                          <td class="px-3 py-2 font-medium">{labelEn(row.chapterId?.name)}</td>
                          <td class="px-3 py-2">{row.totalQuestions}</td>
                          <td class="px-3 py-2">{row.attemptedCount}</td>
                          <td class="px-3 py-2">{row.correctCount}</td>
                          <td class="px-3 py-2">{row.incorrectCount}</td>
                          <td class="px-3 py-2">{row.obtainedMarks} / {row.totalMarks}</td>
                          <td class="px-3 py-2">{pct(row.accuracy)}</td>
                          <td class="px-3 py-2 whitespace-nowrap">{formatDurationMs(row.timeSpentMs)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </section>
            {/if}
          </div>
        {:else}
          <p class="text-sm text-[var(--sh-ai-sub)]">No data.</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
