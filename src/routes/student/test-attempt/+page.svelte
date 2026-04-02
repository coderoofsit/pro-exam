<script lang="ts">
  import type { PageData } from './$types';
  import TestAttempt from '$lib/components/TestAttempt.svelte';

  let { data }: { data: PageData } = $props();

  const questions = $derived(data.questions ?? []);
  const sections = $derived(data.sections ?? []);
  const testName = $derived(data.testName ?? 'Test');
  const duration = $derived(data.durationMinutes ?? 60);
  const testId = $derived(data.testId ?? '');
  const batchId = $derived(data.batchId ?? '');
  const expiresAt = $derived(data.expiresAt ?? null);
  const questionCount = $derived(data.questionCount ?? null);
  const attemptId = $derived(data.attemptId ?? null);
</script>

<svelte:head>
  <title>{testName} — ExamFlow</title>
</svelte:head>

{#if data.loadError}
  <p class="p-6 text-sm text-[var(--pc-error-text)]" role="alert">{data.loadError}</p>
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