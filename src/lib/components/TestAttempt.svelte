<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount, tick } from 'svelte';
  import MathText from '$lib/components/MathText.svelte';
  import BackButton from '$lib/components/BackButton.svelte';
  import Button from '$lib/components/Button.svelte';
  import ImageLightbox from '$lib/components/ImageLightbox.svelte';
  import {
    BATCH_TEST_ATTEMPT_STORAGE_KEY,
    extractQuestionId,
    submitTestAttempt,
    updateTestAttemptQuestion,
    type BatchTestAttemptSession
  } from '$lib/api/testAttempts';
  import type { NormalizedQuestion, NormalizedSection } from '$lib/student/testAttempt/normalize';

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

  type Props = {
    questions: NormalizedQuestion[];
    /** Built in +page (or a single synthetic section when the API omits `sections`). */
    sections?: NormalizedSection[];
    testName?: string;
    durationMinutes?: number;
    expiresAt?: string | null;
    questionCount?: number | null;
    attemptId?: string | null;
    testId: string;
    batchId: string;
    /** Called after PATCH + submit APIs succeed and the finish screen is shown (optional). */
    onSubmit?: (answers: Record<number, string | string[]>) => void;
  };

  let {
    questions,
    sections: sectionsProp = [],
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
  let answers = $state<Record<number, string | string[]>>({});
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
  let questionSecondsSpent = $state(0);
  let questionTimes = $state<Record<number, number>>({});
  let isPaletteOpen = $state(false);
  let selectedMobileSectionIdx = $state(0);

  const total = $derived(questions.length);
  const displayTotal = $derived(
    questionCount != null && questionCount > 0 ? questionCount : questions.length
  );
  const attempted = $derived(Object.keys(answers).length);
  const unattempted = $derived(Math.max(0, displayTotal - attempted));
  const currentQ = $derived(questions[currentIndex]);
  const prompt = $derived(currentQ?.prompt?.en);
  const isLast = $derived(currentIndex === total - 1);
  const PREFETCH_AHEAD_COUNT = 2;

  function collectMathStringsForQuestion(q: NormalizedQuestion | undefined): string[] {
    if (!q) return [];
    const out: string[] = [];
    const stem = String(q.prompt?.en?.content ?? '').trim();
    if (stem) out.push(stem);
    const opts = Array.isArray(q.prompt?.en?.options) ? q.prompt.en.options : [];
    for (const opt of opts) {
      const s = String(opt?.content ?? '').trim();
      if (s) out.push(s);
    }
    return out;
  }

  const prefetchMathContents = $derived.by(() => {
    const unique = new Set<string>();
    const out: string[] = [];
    for (let i = 1; i <= PREFETCH_AHEAD_COUNT; i++) {
      const idx = currentIndex + i;
      if (idx < 0 || idx >= questions.length) continue;
      for (const s of collectMathStringsForQuestion(questions[idx])) {
        if (unique.has(s)) continue;
        unique.add(s);
        out.push(s);
      }
    }
    return out;
  });

  /** Section list for palette / headings; falls back to one block when `sections` prop is empty. */
  const normalizedSections = $derived.by((): NormalizedSection[] => {
    if (sectionsProp.length > 0) return sectionsProp;
    if (questions.length === 0) return [];
    return [
      {
        slug: '_all',
        title: 'Questions',
        questionStartIndex: 0,
        questionEndIndex: questions.length - 1,
        questions
      }
    ];
  });

  const hasMultipleSections = $derived(normalizedSections.length > 1);

  /** Show section titles when we have real sections (not a single generic “Questions” bucket). */
  const showSectionChrome = $derived.by(() => {
    if (normalizedSections.length === 0) return false;
    if (normalizedSections.length > 1) return true;
    const s = normalizedSections[0];
    return s.slug !== '_all' && s.title !== 'Questions';
  });

  const currentSection = $derived.by((): NormalizedSection | null => {
    for (const sec of normalizedSections) {
      if (
        currentIndex >= sec.questionStartIndex &&
        currentIndex <= sec.questionEndIndex
      ) {
        return sec;
      }
    }
    return normalizedSections[0] ?? null;
  });

  /** 1-based index within the current section (for labels when multiple sections exist). */
  const localSectionQIndex = $derived(
    currentSection ? currentIndex - currentSection.questionStartIndex + 1 : currentIndex + 1
  );
  const localSectionQTotal = $derived(currentSection?.questions.length ?? total);

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

  const formattedQuestionTime = $derived(
    `${Math.floor(questionSecondsSpent / 60)
      .toString()
      .padStart(2, '0')}:${(questionSecondsSpent % 60).toString().padStart(2, '0')}`
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

  const rawAnswer = answers[questionIndex];
  const answer = rawAnswer !== undefined
    ? (Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer])
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
  const elapsed = Math.max(0, Date.now() - questionEnteredAt);
  const totalMsSoFar = (questionTimes[prevIndex] ?? 0) + elapsed;
  questionTimes[prevIndex] = totalMsSoFar;

  currentIndex = index;
  questionEnteredAt = Date.now();
  questionSecondsSpent = Math.floor((questionTimes[currentIndex] ?? 0) / 1000);

  // Sync mobile section index
  const secIdx = normalizedSections.findIndex(
    (s) => index >= s.questionStartIndex && index < s.questionStartIndex + s.questions.length
  );
  if (secIdx !== -1) selectedMobileSectionIdx = secIdx;

  isPaletteOpen = false; // Close sidebar on mobile when navigating
  void flushQuestionForIndex(prevIndex, { timeSpentMsOverride: totalMsSoFar });
}

// Function to handle section change from horizontal scroller
function selectSection(idx: number) {
  selectedMobileSectionIdx = idx;
  const targetSec = normalizedSections[idx];
  if (targetSec) {
    void goTo(targetSec.questionStartIndex);
  }
}

  async function markAndNext() {
  if (submitted) return;

  const prevIndex = currentIndex;
  const elapsed = Math.max(0, Date.now() - questionEnteredAt);
  const totalMsSoFar = (questionTimes[prevIndex] ?? 0) + elapsed;
  questionTimes[prevIndex] = totalMsSoFar;

  marked = new Set([...marked, currentIndex]);

  if (currentIndex < total - 1) {
    currentIndex = currentIndex + 1;
  }

  questionEnteredAt = Date.now();
  questionSecondsSpent = Math.floor((questionTimes[currentIndex] ?? 0) / 1000);

  void flushQuestionForIndex(prevIndex, { timeSpentMsOverride: totalMsSoFar });
}

  function openImageLightbox(src: string) {
    imageLightboxSrc = src;
  }

  function closeImageLightbox() {
    imageLightboxSrc = null;
  }



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
        const next: Record<number, string | string[]> = {};
        for (const [k, v] of Object.entries(s.answers)) {
          const idx = Number(k);
          if (!Number.isNaN(idx)) {
            if (Array.isArray(v)) {
              next[idx] = v.filter(item => typeof item === 'string');
            } else if (typeof v === 'string') {
              next[idx] = v;
            }
          }
        }
        answers = next;
      }

      if (s.questionTimes && typeof s.questionTimes === 'object') {
        const next: Record<number, number> = {};
        for (const [k, v] of Object.entries(s.questionTimes)) {
          const idx = Number(k);
          if (!Number.isNaN(idx) && typeof v === 'number') next[idx] = v;
        }
        questionTimes = next;
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
      const currentElapsed = Date.now() - questionEnteredAt;
      const totalMs = (questionTimes[currentIndex] ?? 0) + currentElapsed;
      questionSecondsSpent = Math.floor(totalMs / 1000);
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
      currentQuestionIndex: currentIndex,
      questionTimes: Object.fromEntries(
        Object.entries(questionTimes).map(([k, v]) => [String(k), v])
      )
    };
    if (!prev?.expiresAt) {
      patch.timerEndsAt = timerEndsAt ?? undefined;
    }
    writeSessionPatch(patch);
  });

function selectOption(identifier: string) {
  if (submitted) return;
  const kind = currentQ?.questionKind?.toUpperCase() ?? 'MCQ';
  const current = answers[currentIndex];

  if (kind === 'MSQ') {
    let next: string[] = Array.isArray(current) ? [...current] : (current ? [current] : []);
    if (next.includes(identifier)) {
      next = next.filter((id) => id !== identifier);
    } else {
      next.push(identifier);
    }
    if (next.length === 0) {
      const a = { ...answers };
      delete a[currentIndex];
      answers = a;
    } else {
      answers = { ...answers, [currentIndex]: next };
    }
  } else {
    // MCQ or fallback
    answers = { ...answers, [currentIndex]: identifier };
  }
}

function handleInputChange(e: Event) {
  if (submitted) return;
  const val = (e.target as HTMLInputElement).value;
  if (!val.trim()) {
    const a = { ...answers };
    delete a[currentIndex];
    answers = a;
  } else {
    answers = { ...answers, [currentIndex]: val };
  }
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
    const totalMsFinal = (questionTimes[currentIndex] ?? 0) + timeSpentMs;
    questionTimes[currentIndex] = totalMsFinal;

    await flushQuestionForIndex(currentIndex, {
      timeSpentMsOverride: totalMsFinal
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
    width: auto;
    max-width: min(100%, 14rem);
    min-height: 3rem;
    max-height: 8rem;
    flex-shrink: 0;
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
    max-height: 7rem;
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
  class="flex min-h-0 h-screen flex-col bg-[var(--ta-page-bg)] font-sans transition-colors duration-300"
  data-attempt-id={attemptId ?? ''}
>
  <!-- Fixed Top Header (Mobile/Tablet Only) -->
  <header class="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-[var(--ta-header-border)] bg-[var(--ta-header-bg)] px-4 shadow-sm backdrop-blur-md lg:hidden">
    <div class="flex items-center gap-2">
      <div
        class="flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-sm font-bold
        {timerWarn
          ? 'bg-[var(--ta-timer-warn-bg)] border-[var(--ta-timer-warn-border)] text-[var(--ta-timer-warn-text)]'
          : 'bg-[var(--ta-timer-bg)] border-[var(--ta-timer-border)] text-[var(--ta-timer-text)]'}"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {formattedTime}
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Button
        variant="ta-submit"
        onClick={openSubmitConfirm}
        disabled={submitted || submitInFlight}
        className="!h-8 !px-3 !py-0 !text-[10px] !font-bold !uppercase !tracking-wider"
      >
        Submit
      </Button>
      
      <button
        type="button"
        onclick={() => (isPaletteOpen = true)}
        class="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ta-nav-btn-border)] bg-[var(--ta-nav-btn-bg)] text-[var(--ta-nav-btn-text)] transition-colors hover:bg-[var(--ta-nav-btn-hover-bg)]"
        aria-label="Open Palette"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </header>
    <!-- Main Content Area Wrapper -->
    <div class="flex min-h-0 flex-1 flex-col bg-[var(--ta-page-bg)]">
      <!-- Mobile Section Tabs (Visible only on mobile/tablet) -->
      <div class="lg:hidden flex-shrink-0 border-b border-[var(--ta-divider)] bg-[var(--ta-header-bg)]">
        <!-- Subject Tabs -->
        <div class="flex w-full overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div class="flex gap-8">
            {#each normalizedSections as sec, idx}
              <button
                type="button"
                onclick={() => selectSection(idx)}
                class="
                  relative shrink-0 py-3 text-xs font-bold uppercase tracking-widest transition-all
                  {selectedMobileSectionIdx === idx
                    ? 'text-white'
                    : 'text-gray-500'}
                "
              >
                {sec.title}
                {#if selectedMobileSectionIdx === idx}
                  <div class="absolute bottom-0 left-0 h-0.5 w-full bg-blue-500"></div>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Question Number Scroller (Internal to Section) -->
        <div class="flex w-full overflow-x-auto border-t border-[var(--ta-divider)] px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div class="flex gap-3">
            {#if normalizedSections[selectedMobileSectionIdx]}
              {@const sec = normalizedSections[selectedMobileSectionIdx]}
              {#each sec.questions as _, qi}
                {@const i = sec.questionStartIndex + qi}
                {@const state = pillState(i)}
                <button
                  type="button"
                  onclick={() => void goTo(i)}
                  class="
                    flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all
                    {state === 'current'
                      ? 'bg-[var(--ta-pill-current-bg)] text-[var(--ta-pill-current-text)] ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--ta-header-bg)]'
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
            {/if}
          </div>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-row overflow-hidden">
    <main class="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
      <div class="mx-auto flex max-w-3xl flex-col gap-6">
        {#if normalizedSections.length > 1 && !isPaletteOpen}
          <div class="hidden lg:flex flex-wrap items-center gap-2 border-b border-[var(--ta-palette-border)] pb-4">
            {#each normalizedSections as sec}
              {@const isActive = currentSection?.slug === sec.slug}
              <button
                type="button"
                onclick={() => void goTo(sec.questionStartIndex)}
                class="
                  relative px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200
                  {isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'}
                "
              >
                {sec.title}
                {#if isActive}
                  <span
                    class="absolute bottom-[-1px] left-0 h-[2px] w-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  ></span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        <div class="flex flex-col">
          <div class="mb-3 flex items-center justify-between gap-4">
            {#if showSectionChrome && currentSection}
              <p
                class="text-[11px] font-semibold uppercase tracking-wider text-[var(--ta-header-sub)] opacity-80"
              >
                {currentSection.title}
              </p>
            {:else}
              <div></div>
            {/if}

            <div class="flex items-center gap-2">
              <div
                class="flex items-center gap-1.5 rounded-full bg-[var(--ta-timer-bg)] px-2.5 py-1 font-mono text-[11px] font-bold text-[var(--ta-timer-text)] border border-[var(--ta-timer-border)] shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="opacity-70">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
                  <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                {formattedQuestionTime}
              </div>

              {#if currentQ?.questionKind}
                <span
                  class="inline-flex items-center rounded-full bg-[var(--ta-nav-btn-primary-bg)] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--ta-nav-btn-primary-text)] border border-[color-mix(in_srgb,white_20%,var(--ta-nav-btn-primary-bg))] shadow-sm"
                >
                  {currentQ.questionKind}
                </span>
              {/if}
            </div>
          </div>

          <div class="flex items-start gap-4">
            <span
              class="
              inline-flex h-9 w-9 flex-shrink-0 items-center justify-center
              rounded-full text-sm font-bold shadow-sm leading-none
              bg-[var(--ta-qnum-bg)] text-[var(--ta-qnum-text)]
            "
            >
              {currentIndex + 1}
            </span>
            <div class="min-w-0 flex-1">
              <div
                class="ta-math-content mb-4 overflow-x-auto text-[1.05rem] font-medium leading-relaxed text-[var(--ta-qtext)]"
              >
                <MathText content={prompt?.content ?? ''} />
              </div>
            </div>
          </div>

          {#if prompt?.images?.length}
            <div class="mb-6 flex flex-row flex-wrap gap-3">
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
            {#if ['INTEGER', 'FILL_IN_THE_BLANK', 'NUMERIC', 'SUBJECTIVE'].includes(currentQ?.questionKind?.toUpperCase() ?? '')}
              <div class="flex flex-col gap-2">
                <label for="integer-input" class="text-xs font-semibold text-[var(--ta-header-sub)] opacity-70">
                  Type your answer below:
                </label>
                <input
                  id="integer-input"
                  type="text"
                  value={typeof answers[currentIndex] === 'string' ? answers[currentIndex] : ''}
                  oninput={handleInputChange}
                  disabled={submitted || submitInFlight}
                  placeholder="Enter your answer..."
                  class="
                    w-full rounded-xl border-2 p-4 text-base font-medium transition-all duration-200
                    bg-[var(--ta-opt-bg)] border-[var(--ta-opt-border)]
                    text-[var(--ta-qtext)] placeholder:text-[var(--ta-header-sub)] placeholder:opacity-50
                    focus:border-[var(--ta-nav-btn-primary-bg)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--ta-nav-btn-primary-bg)_10%,transparent)]
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                />
              </div>
            {:else}
              {#each prompt?.options ?? [] as opt}
                {@const currentVal = answers[currentIndex]}
                {@const selected = Array.isArray(currentVal) 
                  ? currentVal.includes(opt.identifier) 
                  : currentVal === opt.identifier}
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
            {/if}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ta-primary"
            onClick={() => void goTo(currentIndex - 1)}
            disabled={currentIndex === 0 || submitted || submitInFlight}
            className="
              !inline-flex !w-[6.75rem] !self-center !h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border !px-2.5 !py-0 text-xs font-medium leading-none whitespace-nowrap
              transition-all duration-150
              disabled:cursor-not-allowed
            "
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Previous
          </Button>

          <Button
            variant="ta-nav"
            onClick={() => void clearCurrentAnswer()}
            disabled={answers[currentIndex] === undefined || submitted || submitInFlight}
            className="
              !inline-flex !w-[6.75rem] !self-center !h-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ta-divider)] !px-2.5 !py-0 text-xs font-medium leading-none whitespace-nowrap
              transition-colors duration-150
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            Clear
          </Button>

          <Button
            variant="ta-mark"
            onClick={() => void markAndNext()}
            disabled={submitted || submitInFlight}
            className="
              !inline-flex !w-[6.75rem] !self-center !h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border !px-2.5 !py-0 text-xs font-semibold leading-none whitespace-nowrap
              transition-colors
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            Mark &amp; next
          </Button>

          <Button
            variant={isLast ? 'ta-submit' : 'ta-primary'}
            onClick={() =>
              void (isLast ? openSubmitConfirm() : goTo(currentIndex + 1))}
            disabled={submitted || submitInFlight}
            className="
              !inline-flex !w-[6.75rem] !self-center !h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent !px-2.5 !py-0 text-xs font-semibold leading-none whitespace-nowrap
              transition-shadow duration-150
              disabled:cursor-not-allowed
            "
          >
            <span class="leading-none">{isLast ? 'Submit' : 'Next'}</span>
            {#if !isLast}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </Button>
        </div>
      </div>
    </main>

    <!-- Desktop Sidebar Palette -->
    <aside
      class="
        hidden lg:flex min-h-0 w-full flex-shrink-0 flex-col border-l border-[var(--ta-palette-border)]
        bg-[var(--ta-palette-bg)] lg:h-full lg:w-[220px] lg:max-w-[260px] xl:w-[256px]
      "
    >
      <div
        class="sticky top-0 z-30 flex-shrink-0 flex items-center justify-end gap-3 px-4 py-3 bg-[var(--ta-header-bg)] border-b border-[var(--ta-header-border)] shadow-sm backdrop-blur-md"
      >
        <div class="flex items-center justify-end gap-3 w-full">
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

          <Button
            variant="ta-submit"
            onClick={openSubmitConfirm}
            disabled={submitted || submitInFlight}
            className="
              flex-shrink-0 inline-flex items-center gap-2
              px-4 py-2 rounded-xl text-xs font-semibold
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
          </Button>
        </div>
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
        <div class="flex flex-col gap-4">
          {#each normalizedSections as sec, secIdx (`${sec.slug}-${secIdx}-desktop`)}
            <div class="min-w-0">
              {#if showSectionChrome}
                <p
                  class="mb-2 truncate text-[10px] font-bold uppercase tracking-wider text-[var(--ta-palette-sub)]"
                  title={sec.title}
                >
                  {sec.title}
                </p>
              {/if}
              <div class="grid grid-cols-5 gap-1.5 lg:grid-cols-5">
                {#each sec.questions as _, qi (`${sec.slug}-${sec.questionStartIndex + qi}-desktop`)}
                  {@const i = sec.questionStartIndex + qi}
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
            </div>
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
  </div>

{#if showConfirm}
  <button
    class="fixed inset-0 z-[150] cursor-default bg-black/60 backdrop-blur-md"
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
      fixed left-1/2 top-1/2 z-[160]
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
        <Button
          variant="ta-nav"
          onClick={() => {
            showConfirm = false;
          }}
          className="
            flex-1 rounded-xl border border-[var(--ta-nav-btn-border)] bg-[var(--ta-nav-btn-bg)]
            py-2.5 text-sm font-medium text-[var(--ta-nav-btn-text)]
            transition-colors duration-150 hover:bg-[var(--ta-nav-btn-hover-bg)]
          "
        >
          Continue
        </Button>
        <Button
          variant="ta-submit"
          onClick={() => void handleSubmit()}
          disabled={submitInFlight}
          className="
            flex-1 rounded-xl py-2.5 text-sm font-semibold
            transition-colors
            disabled:cursor-not-allowed disabled:opacity-70
          "
        >
          {submitInFlight ? 'Submitting…' : 'Submit'}
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if showFinishScreen}
  <div
    class="fixed inset-0 z-[170] flex flex-col items-center justify-center bg-[var(--ta-page-bg)] px-6 py-10"
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
      <BackButton
        label="Back to my tests"
        onClick={() => goToTestsList()}
        className="mt-6 w-full bg-[var(--ta-nav-btn-primary-bg)] text-[var(--ta-nav-btn-primary-text)] shadow-[var(--ta-nav-btn-primary-shadow)] hover:bg-[var(--ta-nav-btn-primary-bg)] hover:text-[var(--ta-nav-btn-primary-text)]"
      />
    </div>
  </div>
{/if}



<ImageLightbox src={imageLightboxSrc} onClose={closeImageLightbox} />

<!-- Pre-render only the next 2 questions' math off-screen to warm MathJax cache. -->
{#if prefetchMathContents.length > 0}
  <div
    aria-hidden="true"
    class="pointer-events-none fixed left-[-99999px] top-0 h-px w-px overflow-hidden opacity-0"
  >
    {#each prefetchMathContents as content, i (`prefetch-math-${currentIndex}-${i}`)}
      <MathText {content} />
    {/each}
  </div>
{/if}

<!-- Backdrop for Mobile Sidebar -->
{#if isPaletteOpen}
  <button
    type="button"
    class="fixed inset-0 z-[190] bg-black/90 backdrop-blur-md lg:hidden"
    onclick={() => (isPaletteOpen = false)}
    aria-label="Close Sidebar"
  ></button>
{/if}

<!-- Mobile Sidebar Palette -->
<aside
  class="
    fixed right-0 top-0 z-[200] h-full w-full transition-transform duration-300 ease-in-out
    flex flex-col border-l border-[var(--ta-palette-border)] bg-[var(--ta-palette-bg)] shadow-2xl
    lg:hidden
    {isPaletteOpen ? 'translate-x-0' : 'translate-x-full'}
  "
>
  <div
    class="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--ta-header-bg)] border-b border-[var(--ta-header-border)] shadow-sm backdrop-blur-md"
  >
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (isPaletteOpen = false)}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ta-nav-btn-border)] bg-[var(--ta-nav-btn-bg)] text-[var(--ta-nav-btn-text)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <span class="text-xs font-bold text-[var(--ta-palette-title)]">Question Palette</span>
    </div>
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
    <div class="flex flex-col gap-4">
      {#each normalizedSections as sec, secIdx (`${sec.slug}-${secIdx}-mobile-v4`)}
        <div class="min-w-0">
          {#if showSectionChrome}
            <p
              class="mb-2 truncate text-[10px] font-bold uppercase tracking-wider text-[var(--ta-palette-sub)]"
              title={sec.title}
            >
              {sec.title}
            </p>
          {/if}
          <div class="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {#each sec.questions as _, qi (`${sec.slug}-${sec.questionStartIndex + qi}-mobile-v4`)}
              {@const i = sec.questionStartIndex + qi}
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
        </div>
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
