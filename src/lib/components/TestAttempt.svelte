<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount, tick } from 'svelte';
  import MathText from '$lib/components/MathText.svelte';
  import {
    BATCH_TEST_ATTEMPT_STORAGE_KEY,
    extractQuestionId,
    submitTestAttempt,
    updateTestAttemptQuestion,
    type BatchTestAttemptSession
  } from '$lib/api/testAttempts';

  type Option = {
    identifier: string;
    content: string;
    images: string[];
  };

  type QuestionPrompt = {
    content: string;
    options: Option[];
    images: string[];
  };

  type Question = {
    _id?: string;
    id?: string;
    prompt: {
      en: QuestionPrompt;
    };
  };

  type Props = {
    questions: Question[];
    testName?: string;
    durationMinutes?: number;
    expiresAt?: string | null;
    questionCount?: number | null;
    attemptId?: string | null;
    testId: string;
    batchId: string;
    /** Called after PATCH + submit APIs succeed and the finish screen is shown (optional). */
    onSubmit?: (answers: Record<number, string>) => void;
  };

  let {
    questions,
    testName = 'Test',
    durationMinutes = 60,
    expiresAt = null,
    questionCount = null,
    attemptId = null,
    testId,
    batchId,
    onSubmit
  }: Props = $props();

  let currentIndex = $state(0);
  let answers = $state<Record<number, string>>({});
  let marked = $state<Set<number>>(new Set());
  let timerEndsAt = $state<number | null>(null);
  let nowTick = $state(0);
  let persistenceReady = $state(false);
  let submitted = $state(false);
  let showConfirm = $state(false);
  let questionEnteredAt = $state(Date.now());
  let submitInFlight = $state(false);
  let showFinishScreen = $state(false);
  let submitFinishError = $state<string | null>(null);
  let imageLightboxSrc = $state<string | null>(null);

  const total = $derived(questions.length);
  const displayTotal = $derived(
    questionCount != null && questionCount > 0 ? questionCount : questions.length
  );
  const attempted = $derived(Object.keys(answers).length);
  const unattempted = $derived(Math.max(0, displayTotal - attempted));
  const currentQ = $derived(questions[currentIndex]);
  const prompt = $derived(currentQ?.prompt?.en);
  const isLast = $derived(currentIndex === total - 1);

  const secondsLeft = $derived.by(() => {
    void nowTick;
    const iso = expiresAt?.trim();
    if (iso) {
      const end = Date.parse(iso);
      if (!Number.isNaN(end)) {
        return Math.max(0, Math.floor((end - Date.now()) / 1000));
      }
    }
    const ends = timerEndsAt;
    if (ends == null) return Math.max(1, durationMinutes) * 60;
    return Math.max(0, Math.floor((ends - Date.now()) / 1000));
  });

  const timerWarn = $derived(secondsLeft <= 300);

  const formattedTime = $derived(
    `${Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, '0')}:${(secondsLeft % 60).toString().padStart(2, '0')}`
  );

  function readSession(): BatchTestAttemptSession | null {
    if (!browser) return null;
    try {
      const raw = sessionStorage.getItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as BatchTestAttemptSession;
    } catch {
      return null;
    }
  }

  function sessionBatchKey(b: string) {
    return (b ?? '').trim();
  }

  function writeSessionPatch(patch: Partial<BatchTestAttemptSession>) {
    if (!browser) return;
    const prev = readSession();
    if (!prev) return;
    if (prev.testId !== testId || sessionBatchKey(prev.batchId ?? '') !== sessionBatchKey(batchId)) return;
    sessionStorage.setItem(
      BATCH_TEST_ATTEMPT_STORAGE_KEY,
      JSON.stringify({ ...prev, ...patch })
    );
  }

  let stopTick: (() => void) | null = null;

  function resolveAttemptId(): string | null {
    const fromProp = (attemptId ?? '').trim();
    if (fromProp) return fromProp;
    const s = readSession();
    const fromSession = typeof s?.attemptId === 'string' ? s.attemptId.trim() : '';
    return fromSession || null;
  }

  function getQuestionBackendId(index: number): string | undefined {
    const q = questions[index] as unknown;
    if (q == null) return undefined;
    const direct = extractQuestionId(q);
    if (direct) return direct;
    if (typeof q === 'object' && q !== null && 'prompt' in q) {
      const fromPrompt = extractQuestionId((q as { prompt?: unknown }).prompt);
      if (fromPrompt) return fromPrompt;
    }
    const fromSession = readSession()?.questionIds?.[index]?.trim();
    if (fromSession) return fromSession;
    return undefined;
  }


type FlushOpts = {
  answerOverride?: string[] | null;
  timeSpentMsOverride?: number;
};

async function flushQuestionForIndex(questionIndex: number, opts?: FlushOpts) {
  if (submitted) return;

  const aid = resolveAttemptId();
  if (!aid) {
    if (import.meta.env.DEV) {
      console.warn('[TestAttempt] update skipped: missing attemptId (prop + session).');
    }
    return;
  }

  const questionId = getQuestionBackendId(questionIndex);
  if (!questionId) {
    if (import.meta.env.DEV) {
      console.warn(
        '[TestAttempt] update skipped: missing question id for index',
        questionIndex,
        questions[questionIndex]
      );
    }
    return;
  }

  const timeSpentMs =
    opts?.timeSpentMsOverride ?? Math.max(0, Date.now() - questionEnteredAt);

  const answer =
    opts?.answerOverride !== undefined
      ? opts.answerOverride
      : answers[questionIndex] !== undefined
        ? [answers[questionIndex]]
        : null;

  try {
    const res = await updateTestAttemptQuestion(aid, questionId, {
      timeSpentMs,
      answer
    });

    if (!res.success) {
      console.warn('updateTestAttemptQuestion failed', res.message, res.status);
    }
  } catch (e) {
    console.error('updateTestAttemptQuestion', e);
  }
}


  async function goTo(index: number) {
  if (submitted || index < 0 || index >= total) return;
  if (index === currentIndex) return;

  const prevIndex = currentIndex;
  const timeSpentMs = Math.max(0, Date.now() - questionEnteredAt);

  currentIndex = index;
  questionEnteredAt = Date.now();

  void flushQuestionForIndex(prevIndex, { timeSpentMsOverride: timeSpentMs });
}

  async function markAndNext() {
  if (submitted) return;

  const prevIndex = currentIndex;
  const timeSpentMs = Math.max(0, Date.now() - questionEnteredAt);

  marked = new Set([...marked, currentIndex]);

  if (currentIndex < total - 1) {
    currentIndex = currentIndex + 1;
  }

  questionEnteredAt = Date.now();

  void flushQuestionForIndex(prevIndex, { timeSpentMsOverride: timeSpentMs });
}

  function openImageLightbox(src: string) {
    imageLightboxSrc = src;
  }

  function closeImageLightbox() {
    imageLightboxSrc = null;
  }

  $effect(() => {
    if (!browser || !imageLightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImageLightbox();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  onMount(() => {
    if (!browser || !testId.trim()) {
      persistenceReady = true;
      questionEnteredAt = Date.now();
      return;
    }

    const s = readSession();
    const durationSec = Math.max(1, durationMinutes * 60);
    const serverExpires = expiresAt?.trim()
      ? Date.parse(expiresAt.trim())
      : s?.expiresAt
        ? Date.parse(s.expiresAt)
        : NaN;

    if (s && s.testId === testId && sessionBatchKey(s.batchId ?? '') === sessionBatchKey(batchId)) {
      if (!Number.isNaN(serverExpires) && serverExpires > 0) {
        timerEndsAt = serverExpires;
      } else if (s.timerEndsAt != null && s.timerEndsAt > Date.now()) {
        timerEndsAt = s.timerEndsAt;
      } else if (s.timerEndsAt != null && s.timerEndsAt <= Date.now()) {
        timerEndsAt = Date.now();
      } else {
        timerEndsAt = Date.now() + durationSec * 1000;
        writeSessionPatch({ timerEndsAt });
      }

      if (s.answers && typeof s.answers === 'object') {
        const next: Record<number, string> = {};
        for (const [k, v] of Object.entries(s.answers)) {
          const idx = Number(k);
          if (!Number.isNaN(idx) && typeof v === 'string') next[idx] = v;
        }
        answers = next;
      }

      if (Array.isArray(s.markedIndices)) {
        marked = new Set(s.markedIndices.filter((n) => Number.isInteger(n)));
      }

      if (
        typeof s.currentQuestionIndex === 'number' &&
        s.currentQuestionIndex >= 0 &&
        s.currentQuestionIndex < total
      ) {
        currentIndex = s.currentQuestionIndex;
      }
    } else {
      timerEndsAt = Date.now() + durationSec * 1000;
      writeSessionPatch({ timerEndsAt });
    }

    if (timerEndsAt == null) {
      timerEndsAt = Date.now() + durationSec * 1000;
      writeSessionPatch({ timerEndsAt });
    }

    persistenceReady = true;
    questionEnteredAt = Date.now();

    const interval = setInterval(() => {
      nowTick++;
      const endMs = !Number.isNaN(serverExpires) && serverExpires > 0
        ? serverExpires
        : timerEndsAt;
      if (endMs != null && Date.now() >= endMs && !submitted && !submitInFlight) {
        void handleSubmit();
      }
    }, 1000);

    stopTick = () => clearInterval(interval);
    return () => clearInterval(interval);
  });

  $effect(() => {
    if (!persistenceReady || !browser || !testId.trim()) return;
    void answers;
    void marked;
    void currentIndex;
    void timerEndsAt;
    const prev = readSession();
    const patch: Partial<BatchTestAttemptSession> = {
      answers: Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [String(k), v])
      ),
      markedIndices: [...marked],
      currentQuestionIndex: currentIndex
    };
    if (!prev?.expiresAt) {
      patch.timerEndsAt = timerEndsAt ?? undefined;
    }
    writeSessionPatch(patch);
  });

function selectOption(identifier: string) {
  if (submitted) return;
  answers = { ...answers, [currentIndex]: identifier };
}

function clearCurrentAnswer() {
  if (submitted) return;
  const a = { ...answers };
  delete a[currentIndex];
  answers = a;
}
  let finishRedirectTimer: ReturnType<typeof setTimeout> | null = null;
  let finishNavigated = false;

  function clearFinishRedirectTimer() {
    if (finishRedirectTimer != null) {
      clearTimeout(finishRedirectTimer);
      finishRedirectTimer = null;
    }
  }

  function goToTestsList() {
    if (finishNavigated) return;
    finishNavigated = true;
    clearFinishRedirectTimer();
    goto('/student/tests');
  }

  function scheduleTestsRedirect() {
    clearFinishRedirectTimer();
    finishRedirectTimer = setTimeout(() => {
      finishRedirectTimer = null;
      if (!finishNavigated) {
        finishNavigated = true;
        goto('/student/tests');
      }
    }, 3200);
  }

  onDestroy(() => {
    clearFinishRedirectTimer();
  });

 async function handleSubmit() {
  if (submitted || submitInFlight) return;

  submitInFlight = true;
  submitFinishError = null;

  try {
    const timeSpentMs = Math.max(0, Date.now() - questionEnteredAt);

    await flushQuestionForIndex(currentIndex, {
      timeSpentMsOverride: timeSpentMs
    });

    const aid = resolveAttemptId();
    if (aid) {
      const submitRes = await submitTestAttempt(aid, {});
      if (!submitRes.success) {
        submitFinishError = submitRes.message ?? 'Could not submit the attempt.';
        if (import.meta.env.DEV) {
          console.warn('submitTestAttempt', submitRes.status, submitRes.message);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[TestAttempt] submit skipped: missing attemptId');
    }

    stopTick?.();
    stopTick = null;
    submitted = true;
    showConfirm = false;

    try {
      sessionStorage.removeItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
    } catch {
      // ignore
    }

    showFinishScreen = true;
    onSubmit?.(answers);
    scheduleTestsRedirect();
  } catch (e) {
    console.error('handleSubmit', e);
    submitFinishError =
      e instanceof Error ? e.message : 'Something went wrong while submitting.';
    stopTick?.();
    stopTick = null;
    submitted = true;
    showConfirm = false;
    showFinishScreen = true;
    scheduleTestsRedirect();
  } finally {
    submitInFlight = false;
  }
}

  function pillState(index: number): 'current' | 'attempted' | 'marked' | 'unattempted' {
    if (index === currentIndex) return 'current';
    if (answers[index] !== undefined) return 'attempted';
    if (marked.has(index)) return 'marked';
    return 'unattempted';
  }

  function openSubmitConfirm() {
    if (!submitted && !submitInFlight) showConfirm = true;
  }
</script>

<style>
  .ta-math-content {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .ta-math-content::-webkit-scrollbar {
    display: none;
  }

  .ta-math-content :global(mjx-container),
  .ta-math-content :global(.MathJax),
  .ta-math-content :global(.katex-html) {
    display: inline !important;
  }
  .ta-math-content :global(p) {
    margin: 0;
    line-height: 1.85;
  }

  .ta-img-frame {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
    border-radius: 0.5rem;
    border: 1px solid var(--ta-qpanel-border);
    background: color-mix(in srgb, var(--ta-opt-bg) 88%, transparent);
    padding: 0.35rem;
  }

  .ta-img-frame--stem {
    width: 100%;
    min-height: 3.5rem;
    max-height: min(14rem, 30vh);
  }

  .ta-img-frame--option {
    flex: 1 1 auto;
    min-width: min(100%, 6rem);
    max-width: min(100%, 12rem);
    min-height: 3rem;
    max-height: min(10rem, 22vh);
  }

  .ta-img-frame__img {
    display: block;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: center;
  }

  .ta-img-frame__img--stem {
    max-width: 100%;
    max-height: min(12rem, 28vh);
  }

  .ta-img-frame__img--opt {
    max-width: 100%;
    max-height: min(8rem, 18vh);
  }

  button.ta-img-frame {
    appearance: none;
    margin: 0;
    font: inherit;
    color: inherit;
    cursor: zoom-in;
    text-align: center;
  }

  div.ta-img-frame[role='button'] {
    cursor: zoom-in;
    text-align: center;
  }
</style>

<div
  class="flex min-h-0 flex-1 flex-col bg-[var(--ta-page-bg)] font-sans transition-colors duration-300"
  data-attempt-id={attemptId ?? ''}
>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
  >
    <main class="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-0 sm:px-6">
      <div class="mx-auto flex max-w-2xl flex-col gap-6">
        <div
          class="
          rounded-2xl p-6
          bg-[var(--ta-qpanel-bg)]
          border border-[var(--ta-qpanel-border)]
          shadow-[var(--ta-qpanel-shadow)]
        "
        >
          <div class="mb-5 flex items-center gap-3">
            <span
              class="
              inline-flex h-8 w-8 flex-shrink-0 items-center justify-center
              rounded-full text-xs font-bold
              bg-[var(--ta-qnum-bg)] text-[var(--ta-qnum-text)]
            "
            >
              {currentIndex + 1}
            </span>
            <span class="text-xs text-[var(--ta-header-sub)]">
              Question {currentIndex + 1} of {displayTotal}
            </span>
          </div>

          <div
            class="ta-math-content mb-4 overflow-x-auto text-base font-medium leading-relaxed text-[var(--ta-qtext)]"
          >
            <MathText content={prompt?.content ?? ''} />
          </div>

          {#if prompt?.images?.length}
            <div class="mb-6 flex flex-col gap-3">
              {#each prompt.images as src, imgIdx (`qstem-${currentIndex}-${imgIdx}`)}
                <button
                  type="button"
                  class="ta-img-frame ta-img-frame--stem"
                  onclick={() => openImageLightbox(src)}
                  title="View larger"
                  aria-label="View question image larger"
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="ta-img-frame__img ta-img-frame__img--stem pointer-events-none"
                  />
                </button>
              {/each}
            </div>
          {/if}

          <div class="flex flex-col gap-3">
            {#each prompt?.options ?? [] as opt}
              {@const selected = answers[currentIndex] === opt.identifier}
              <button
                type="button"
                onclick={() => void selectOption(opt.identifier)}
                disabled={submitted || submitInFlight}
                class="
                  group flex w-full items-start gap-4 text-left
                  px-4 py-3.5 rounded-xl
                  border transition-all duration-150
                  disabled:cursor-not-allowed
                  {selected
                    ? 'bg-[var(--ta-opt-selected-bg)] border-[var(--ta-opt-selected-border)]'
                    : 'bg-[var(--ta-opt-bg)] border-[var(--ta-opt-border)] hover:bg-[var(--ta-opt-hover-bg)] hover:border-[var(--ta-opt-hover-border)]'}
                "
              >
                <span
                  class="
                  mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center
                  rounded-lg text-xs font-bold transition-colors duration-150
                  {selected
                    ? 'bg-[var(--ta-opt-label-selected-bg)] text-[var(--ta-opt-label-selected-text)]'
                    : 'bg-[var(--ta-opt-label-bg)] text-[var(--ta-opt-label-text)]'}
                "
                >
                  {opt.identifier}
                </span>
                <div class="min-w-0 flex-1">
                  <div
                    class="ta-math-content overflow-x-auto text-sm font-medium {selected
                      ? 'text-[var(--ta-opt-selected-text)]'
                      : 'text-[var(--ta-opt-text)]'}"
                  >
                    <MathText content={opt.content} />
                  </div>
                  {#if opt.images?.length}
                    <div class="mt-2 flex flex-wrap content-start gap-2">
                      {#each opt.images as src, oi (`opt-${currentIndex}-${opt.identifier}-${oi}`)}
                        <div
                          role="button"
                          tabindex="0"
                          class="ta-img-frame ta-img-frame--option"
                          onclick={(e) => {
                            e.stopPropagation();
                            openImageLightbox(src);
                          }}
                          onkeydown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              openImageLightbox(src);
                            }
                          }}
                          title="View larger"
                          aria-label="View option image larger"
                        >
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            class="ta-img-frame__img ta-img-frame__img--opt pointer-events-none"
                          />
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
                {#if selected}
                  <span class="mt-1 flex-shrink-0 self-start text-[var(--ta-opt-label-selected-bg)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onclick={() => void goTo(currentIndex - 1)}
            disabled={currentIndex === 0 || submitted || submitInFlight}
            class="
              inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium
              bg-[var(--ta-nav-btn-bg)] border-[var(--ta-nav-btn-border)]
              text-[var(--ta-nav-btn-text)]
              transition-all duration-150
              hover:bg-[var(--ta-nav-btn-hover-bg)]
              hover:border-[var(--ta-nav-btn-hover-border)]
              hover:text-[var(--ta-nav-btn-hover-text)]
              disabled:cursor-not-allowed disabled:opacity-40
              disabled:hover:bg-[var(--ta-nav-btn-bg)]
              disabled:hover:border-[var(--ta-nav-btn-border)] disabled:hover:text-[var(--ta-nav-btn-text)]
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Previous
          </button>

          {#if answers[currentIndex] !== undefined}
            <button
              type="button"
              onclick={() => void clearCurrentAnswer()}
              disabled={submitted || submitInFlight}
              class="
                rounded-lg border border-[var(--ta-divider)] px-3 py-1.5 text-xs font-medium
                text-[var(--ta-header-sub)]
                transition-colors duration-150
                hover:border-[var(--ta-nav-btn-hover-border)] hover:text-[var(--ta-header-title)]
                disabled:cursor-not-allowed disabled:opacity-40
              "
            >
              Clear
            </button>
          {/if}

          <button
            type="button"
            onclick={() => void markAndNext()}
            disabled={submitted || submitInFlight}
            class="
              inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold
              border-amber-500/40 bg-amber-500/10 text-amber-100
              transition-colors hover:bg-amber-500/20
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            Mark &amp; next
          </button>

          <button
            type="button"
            onclick={() =>
              void (isLast ? openSubmitConfirm() : goTo(currentIndex + 1))}
            disabled={submitted || submitInFlight}
            class="
              inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold
              text-[var(--ta-nav-btn-primary-text)]
              bg-[var(--ta-nav-btn-primary-bg)]
              shadow-[var(--ta-nav-btn-primary-shadow)]
              transition-shadow duration-150
              hover:shadow-[0_6px_24px_rgba(79,126,255,0.45)]
              disabled:opacity-50
            "
          >
            {isLast ? 'Submit' : 'Next'}
            {#if !isLast}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </main>

    <aside
      class="
        flex min-h-0 w-full flex-shrink-0 flex-col border-t border-[var(--ta-palette-border)]
        bg-[var(--ta-palette-bg)]
        max-h-[min(42vh,22rem)] min-h-0
        lg:max-h-none lg:h-full lg:w-[220px] lg:max-w-[260px] xl:w-[256px]
        lg:border-l lg:border-t-0
      "
    >
      <div
    class="
      sticky top-0 z-30 flex-shrink-0 flex items-center justify-end gap-3
      px-4 sm:px-6 py-3
      bg-[var(--ta-header-bg)]
      border-b border-[var(--ta-header-border)]
      shadow-[var(--ta-header-shadow)]
      backdrop-blur-md
    "
  >
    <div
      class="
      flex items-center gap-2 px-4 py-1.5 rounded-xl flex-shrink-0
      border font-mono text-sm font-bold
      {timerWarn
        ? 'bg-[var(--ta-timer-warn-bg)] border-[var(--ta-timer-warn-border)] text-[var(--ta-timer-warn-text)]'
        : 'bg-[var(--ta-timer-bg)] border-[var(--ta-timer-border)] text-[var(--ta-timer-text)]'}
    "
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M12 7v5l3 3"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {formattedTime}
    </div>

    <button
      type="button"
      onclick={openSubmitConfirm}
      disabled={submitted || submitInFlight}
      class="
        flex-shrink-0 inline-flex items-center gap-2
        px-4 py-2 rounded-xl text-xs font-semibold
        bg-red-600 text-white
        shadow-md shadow-red-900/30
        hover:bg-red-700
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Submit
    </button>
  </div>

      <div class="flex-shrink-0 border-b border-[var(--ta-divider)] px-4 pb-3 pt-4 sm:px-5">
        <p class="text-xs font-bold uppercase tracking-wider text-[var(--ta-palette-title)]">
          Question Palette
        </p>
        <p class="mt-1 text-xs text-[var(--ta-palette-sub)]">
          {attempted} answered · {unattempted} remaining
        </p>
      </div>

      <div
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 [scrollbar-width:thin]"
      >
        <div class="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-5">
          {#each questions as _, i}
            {@const state = pillState(i)}
            <button
              type="button"
              onclick={() => void goTo(i)}
              disabled={submitted || submitInFlight}
              title="Question {i + 1}"
              class="
                flex h-9 w-full items-center justify-center rounded-lg text-xs font-bold
                transition-all duration-100
                {state === 'current'
                  ? 'bg-[var(--ta-pill-current-bg)] text-[var(--ta-pill-current-text)] shadow-[var(--ta-pill-current-shadow)]'
                  : state === 'attempted'
                    ? 'border border-[var(--ta-pill-attempted-border)] bg-[var(--ta-pill-attempted-bg)] text-[var(--ta-pill-attempted-text)]'
                    : state === 'marked'
                      ? 'border border-amber-500/40 bg-amber-500/15 text-amber-200'
                      : 'border border-[var(--ta-pill-unattempted-border)] bg-[var(--ta-pill-unattempted-bg)] text-[var(--ta-pill-unattempted-text)]'}
              "
            >
              {i + 1}
            </button>
          {/each}
        </div>

        <div
          class="mt-4 flex flex-col gap-2 border-t border-[var(--ta-divider)] pt-4"
        >
          {#each [
            {
              label: 'Answered',
              class:
                'bg-[var(--ta-pill-attempted-bg)] border-[var(--ta-pill-attempted-border)] text-[var(--ta-pill-attempted-text)]'
            },
            { label: 'Marked', class: 'bg-amber-500/15 border-amber-500/40 text-amber-200' },
            {
              label: 'Not answered',
              class:
                'bg-[var(--ta-pill-unattempted-bg)] border-[var(--ta-pill-unattempted-border)] text-[var(--ta-pill-unattempted-text)]'
            },
            {
              label: 'Current',
              class:
                'bg-[var(--ta-pill-current-bg)] border-[var(--ta-pill-current-bg)] text-[var(--ta-pill-current-text)]'
            }
          ] as item}
            <div class="flex items-center gap-2">
              <span
                class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-[9px] font-bold {item.class}"
              >
                1
              </span>
              <span class="text-xs text-[var(--ta-legend-text)]">{item.label}</span>
            </div>
          {/each}
        </div>
      </div>
    </aside>
  </div>
</div>

{#if showConfirm}
  <button
    class="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm"
    aria-label="Close"
    onclick={() => {
      showConfirm = false;
    }}
  ></button>

  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-title"
    class="
      fixed left-1/2 top-1/2 z-50
      w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2
      overflow-hidden rounded-2xl
      border border-[var(--ta-qpanel-border)] bg-[var(--ta-qpanel-bg)]
      shadow-[0_24px_64px_rgba(5,7,13,0.5)]
    "
  >
    <div class="flex justify-center pb-4 pt-8">
      <span
        class="
        flex h-14 w-14 items-center justify-center rounded-full
        bg-red-600 shadow-md shadow-red-900/40
      "
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="white"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </div>

    <div class="px-6 pb-6 text-center">
      <h2 id="confirm-title" class="mb-2 text-base font-bold text-[var(--ta-header-title)]">
        Submit Test?
      </h2>
      <p class="mb-1 text-sm text-[var(--ta-header-sub)]">
        You have answered <span class="font-semibold text-[var(--ta-header-title)]">{attempted}</span>
        out of <span class="font-semibold text-[var(--ta-header-title)]">{displayTotal}</span> questions.
      </p>
      {#if unattempted > 0}
        <p class="mb-5 text-xs text-[var(--ta-timer-warn-text)]">
          {unattempted} question{unattempted > 1 ? 's' : ''} left unanswered.
        </p>
      {:else}
        <p class="mb-5 text-xs text-[var(--ta-pill-attempted-text)]">All questions answered!</p>
      {/if}

      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => {
            showConfirm = false;
          }}
          class="
            flex-1 rounded-xl border border-[var(--ta-nav-btn-border)] bg-[var(--ta-nav-btn-bg)]
            py-2.5 text-sm font-medium text-[var(--ta-nav-btn-text)]
            transition-colors duration-150 hover:bg-[var(--ta-nav-btn-hover-bg)]
          "
        >
          Continue
        </button>
        <button
          type="button"
          onclick={() => void handleSubmit()}
          disabled={submitInFlight}
          class="
            flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white
            shadow-md shadow-red-900/30 transition-colors hover:bg-red-700
            disabled:cursor-not-allowed disabled:opacity-70
          "
        >
          {submitInFlight ? 'Submitting…' : 'Submit'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showFinishScreen}
  <div
    class="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--ta-page-bg)] px-6 py-10"
    role="status"
    aria-live="polite"
  >
    <div
      class="relative w-full max-w-md rounded-2xl border border-[var(--ta-qpanel-border)] bg-[var(--ta-qpanel-bg)] p-8 text-center shadow-[0_24px_64px_rgba(5,7,13,0.45)]"
    >
      <div class="mb-6 flex justify-center">
        <span
          class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
      <h2 class="text-xl font-bold text-[var(--ta-header-title)]">Test finished</h2>
      <p class="mt-2 text-sm text-[var(--ta-header-sub)]">
        {testName} — your attempt has been submitted.
      </p>
      {#if submitFinishError}
        <p class="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {submitFinishError}
        </p>
      {/if}
      <p class="mt-4 text-xs text-[var(--ta-palette-sub)]">
        Redirecting to your tests in a few seconds…
      </p>
      <button
        type="button"
        onclick={() => goToTestsList()}
        class="mt-6 w-full rounded-xl bg-[var(--ta-nav-btn-primary-bg)] py-3 text-sm font-semibold text-[var(--ta-nav-btn-primary-text)] shadow-[var(--ta-nav-btn-primary-shadow)] transition hover:opacity-95"
      >
        Back to my tests
      </button>
    </div>
  </div>
{/if}

{#if imageLightboxSrc}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label="Enlarged image"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && closeImageLightbox()}
  >
    <button
      type="button"
      class="
        absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center
        rounded-full border border-white/20 bg-white/10 text-white
        transition hover:bg-white/20
      "
      onclick={closeImageLightbox}
      aria-label="Close"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <img
      src={imageLightboxSrc}
      alt=""
      class="max-h-[min(90vh,900px)] max-w-full object-contain"
    />
  </div>
{/if}
