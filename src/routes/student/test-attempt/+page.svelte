<script lang="ts">
  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  import TestAttempt from '$lib/components/TestAttempt.svelte';
  import BackButton from '$lib/components/BackButton.svelte';
  import {
    loadAttemptDataFromSession,
    readAttemptStartError,
    clearAttemptStartError,
    type AttemptPagePayload
  } from '$lib/student/testAttempt/loadAttemptFromSession';

  let { data }: { data: PageData } = $props();

  const isPrelaunch = $derived(data.prelaunch === true);

  let showAttempt = $state(false);
  let prelaunchCountdown = $state(3);
  let countdownDone = $state(false);
  let prelaunchPayload = $state<AttemptPagePayload | null>(null);
  let prelaunchError = $state<string | null>(null);

  /** Resolved props: prelaunch path uses polled payload; normal path uses load data. */
  const questions = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.questions : (data.questions ?? [])
  );
  const sections = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.sections : (data.sections ?? [])
  );
  const testName = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.testName : (data.testName ?? 'Test')
  );
  const duration = $derived(
    showAttempt && prelaunchPayload
      ? prelaunchPayload.durationMinutes
      : (data.durationMinutes ?? 60)
  );
  const testId = $derived(data.testId ?? '');
  const batchId = $derived(data.batchId ?? '');
  const expiresAt = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.expiresAt : (data.expiresAt ?? null)
  );
  const questionCount = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.questionCount : (data.questionCount ?? null)
  );
  const attemptId = $derived(
    showAttempt && prelaunchPayload ? prelaunchPayload.attemptId : (data.attemptId ?? null)
  );

  $effect(() => {
    if (!browser || !isPrelaunch || showAttempt || prelaunchError) return;

    clearAttemptStartError();

    const poll = setInterval(() => {
      const err = readAttemptStartError();
      if (err) {
        prelaunchError = err;
        return;
      }
      if (prelaunchPayload) return;
      const p = loadAttemptDataFromSession(testId, batchId);
      if (p) prelaunchPayload = p;
    }, 120);

    prelaunchCountdown = 3;
    countdownDone = false;

    const cd = setInterval(() => {
      prelaunchCountdown--;
      if (prelaunchCountdown <= 0) {
        clearInterval(cd);
        countdownDone = true;
      }
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(cd);
    };
  });

  $effect(() => {
    if (!isPrelaunch || showAttempt) return;
    if (prelaunchError) return;
    if (!countdownDone || !prelaunchPayload) return;
    showAttempt = true;
    if (browser) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('prelaunch');
        u.searchParams.delete('testName');
        history.replaceState({}, '', u.toString());
      } catch {
        // ignore
      }
    }
  });

</script>

<svelte:head>
  <title>{testName} — Exam Abhyas</title>
</svelte:head>

{#if data.loadError}
  <p class="p-6 text-sm text-[var(--pc-error-text)]" role="alert">{data.loadError}</p>
{:else if isPrelaunch && prelaunchError}
  <div
    class="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[var(--ta-page-bg)] px-6 py-12 text-center font-sans"
    role="alert"
  >
    <p class="max-w-md text-sm text-[var(--pc-error-text)]">{prelaunchError}</p>
    <BackButton label="Back to tests" />
  </div>
{:else if isPrelaunch && !showAttempt}
  <div
    class="flex flex-col items-center justify-center gap-4 px-6 py-12 font-sans text-[var(--ta-header-title)]"
    aria-live="polite"
    style="min-height: 75vh;"
  >
    {#if !countdownDone}
      <p class="text-sm font-medium text-[var(--ta-header-sub)]">Test Start in</p>
      <p
        class="tabular-nums text-7xl font-black tracking-tighter text-[var(--ta-nav-btn-primary-bg)] sm:text-8xl"
      >
        {prelaunchCountdown}
      </p>
      <p class="mt-2 text-sm font-medium text-[var(--ta-palette-sub)] animate-pulse">
        Prepare yourself, test starts in...
      </p>
    {:else if !prelaunchPayload}
      <p class="text-sm font-medium text-[var(--ta-header-sub)]">Preparing your test…</p>
      <p class="mt-2 text-xs text-[var(--ta-palette-sub)]">
        Grouping questions by section. This will only take a moment.
      </p>
      <div
        class="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-[var(--ta-divider)] border-t-[var(--ta-nav-btn-primary-bg)]"
        aria-hidden="true"
      ></div>
    {/if}
  </div>
{:else}
  <TestAttempt
    {questions}
    {sections}
    {testName}
    durationMinutes={duration}
    {testId}
    {batchId}
    expiresAt={expiresAt}
    questionCount={questionCount}
    attemptId={attemptId}
  />
{/if}
