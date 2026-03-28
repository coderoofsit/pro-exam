<script lang="ts">
  import type { PageData } from './$types';
  import OwnTestChaptersPanel from '$lib/components/OwnTestChaptersPanel.svelte';
  import OwnTestChaptersPanelManual from '$lib/components/OwnTestChaptersPanelManual.svelte';
  import OwnTestCreatedSuccessModal from '$lib/components/OwnTestCreatedSuccessModal.svelte';
  import OwnTestQuestionDistributionModal from '$lib/components/OwnTestQuestionDistributionModal.svelte';
  import {
    createManualCustomTest,
    createRandomCustomTest,
    extractCreatedTestIdFromCreateTestResponse
  } from '$lib/api/tests';
  import { createTestAttempt, persistBatchAttemptSessionFromCreateResponse } from '$lib/api/testAttempts';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import type {
    OwnTestDistributionContinueData,
    OwnTestSelectionSnapshot,
    OwnTestSubjectQuestionDistribution,
    OwnTestSubjectSelection,
    OwnTestUnitSelection
  } from '$lib/ownTest/questionDistribution';

  const MINUTES_PER_QUESTION = 1.5;

  function durationMinutesForQuestionCount(count: number): number {
    const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
    return Math.max(1, Math.ceil(n * MINUTES_PER_QUESTION));
  }

  function totalQuestionsFromDistributionPayload(data: OwnTestDistributionContinueData): number {
    let sum = 0;
    for (const subj of data.subjects) {
      for (const cg of subj.chapterGroup) {
        sum += Math.max(0, Math.floor(Number(cg.numberOfQuestions) || 0));
      }
    }
    return sum;
  }
  import { getMaxQuestionsForUnits } from '$lib/ownTest/questionDistribution';
  import { formatIstDateDdMmYyyy } from '$lib/utils/istDate';
  import { page } from '$app/state';

  let { data }: { data: PageData } = $props();

  const groupedSubjects = $derived(data.groupedSubjects ?? []);
  const error = $derived(data.error ?? null);
  const examSlug = $derived(data.examSlug ?? '');
  const examIdFromPage = $derived(data.examId ?? '');
  const boardIdFromPage = $derived(data.boardId ?? '');

  const mode = $derived(page.url.searchParams.get('mode'));
  const isManual = $derived(mode === 'manual');

  const examName = $derived.by(() =>
    examSlug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );

  let distModalOpen = $state(false);
  let distSnapshot = $state<OwnTestSelectionSnapshot | null>(null);
  let distMode = $state<'random' | 'manual'>('random');
  let creatingTest = $state(false);
  let createTestError = $state<string | null>(null);
  let successModalOpen = $state(false);
  /** Set when create-test API succeeds — used for POST /test-attempts on “Start Test”. */
  let createdTestId = $state<string | null>(null);
  let startingOwnSuccessTest = $state(false);
  let successStartError = $state<string | null>(null);
  let manualSelectedIds = $state<Set<string>>(new Set());
  let manualSelectedRows = $state<Array<{ id: string; chapterId: string }>>([]);

  const manualSelectionKey = $derived(`own-manual-selected::${examSlug}`);
  const manualSelectedCount = $derived(manualSelectedIds.size);

  const manualSelectedChapterIds = $derived.by(() => {
    const out = new Set<string>();
    for (const r of manualSelectedRows) {
      if (r.chapterId) out.add(r.chapterId);
    }
    return out;
  });

  const manualSelectedSubjectsForBar = $derived.by(() => {
    const out: { id: string; name: string; accent: number }[] = [];
    if (manualSelectedChapterIds.size === 0) return out;

    for (const [i, row] of groupedSubjects.entries()) {
      let hit = false;
      for (const unit of row.data ?? []) {
        for (const ch of unit.data ?? []) {
          if (manualSelectedChapterIds.has(String(ch._id))) {
            hit = true;
            break;
          }
        }
        if (hit) break;
      }
      if (!hit) continue;
      out.push({
        id: row.subject._id,
        name: row.subject.name?.en ?? row.subject.slug,
        accent: i % 4
      });
    }
    return out;
  });

  $effect(() => {
    if (!browser || !isManual) return;
    try {
      const raw = sessionStorage.getItem(manualSelectionKey);
      if (!raw) {
        manualSelectedIds = new Set();
        manualSelectedRows = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        manualSelectedIds = new Set();
        manualSelectedRows = [];
        return;
      }

      // Back-compat: old format string[]
      if (parsed.every((x) => typeof x === 'string')) {
        const ids = (parsed as string[]).filter(Boolean);
        manualSelectedRows = ids.map((id) => ({ id, chapterId: '' }));
        manualSelectedIds = new Set(ids);
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({ id: String(r?.id ?? ''), chapterId: String(r?.chapterId ?? '') }))
        .filter((r) => r.id);
      manualSelectedRows = rows;
      manualSelectedIds = new Set(rows.map((r) => r.id));
    } catch {
      manualSelectedIds = new Set();
      manualSelectedRows = [];
    }
  });

  function handleChaptersNext(snapshot: OwnTestSelectionSnapshot) {
    createTestError = null;
    distMode = 'random';
    distSnapshot = snapshot;
    distModalOpen = true;
  }

  function buildManualSnapshot(): OwnTestSelectionSnapshot | null {
    const selectedChapterIds = new Set(
      manualSelectedRows.map((r) => String(r.chapterId || '').trim()).filter(Boolean)
    );
    if (selectedChapterIds.size === 0) return null;

    const subjects: OwnTestSubjectSelection[] = [];

    for (const [i, row] of groupedSubjects.entries()) {
      const units: OwnTestUnitSelection[] = [];

      for (const unit of row.data ?? []) {
        const chapterIds = (unit.data ?? [])
          .filter((ch) => selectedChapterIds.has(String(ch._id)))
          .map((ch) => String(ch._id));

        if (chapterIds.length === 0) continue;
        units.push({
          unitId: String(unit.chapterGroup._id),
          unitName: unit.chapterGroup.name?.en ?? unit.chapterGroup.slug,
          chapterIds
        });
      }

      if (units.length === 0) continue;
      subjects.push({
        subjectId: String(row.subject._id),
        subjectSlug: row.subject.slug,
        subjectName: row.subject.name?.en ?? row.subject.slug,
        accent: i % 4,
        units,
        maxQuestions: getMaxQuestionsForUnits(units.length)
      });
    }

    if (subjects.length === 0) return null;

    return {
      examId: String(examIdFromPage ?? '').trim(),
      boardId: String(boardIdFromPage ?? '').trim(),
      subjects
    };
  }

  function handleManualNext() {
    createTestError = null;
    const snapshot = buildManualSnapshot();
    if (!snapshot) return;
    distMode = 'manual';
    distSnapshot = snapshot;
    distModalOpen = true;
  }

  function closeDistModal() {
    if (creatingTest) return;
    distModalOpen = false;
    createTestError = null;
  }

  async function handleDistContinue(_payload: {
    snapshot: OwnTestSelectionSnapshot;
    totalsBySubjectId: Record<string, number>;
    distributionBySubjectId: Record<string, OwnTestSubjectQuestionDistribution>;
    data: OwnTestDistributionContinueData;
  }) {
    const { snapshot, data } = _payload;
    const istDate = formatIstDateDdMmYyyy();
    createTestError = null;
    creatingTest = true;

    const boardId = snapshot.boardId?.trim() || boardIdFromPage;
    const examId = snapshot.examId?.trim() || examIdFromPage;
    if (!boardId || !examId) {
      createTestError =
        'Missing exam or board for this test. Please refresh the page or pick another exam.';
      creatingTest = false;
      return;
    }

    try {
      const manualQuestionCount = manualSelectedRows.length
        ? manualSelectedRows.length
        : manualSelectedIds.size;
      const randomQuestionCount = totalQuestionsFromDistributionPayload(data);
      const durationMinutes = durationMinutesForQuestionCount(
        distMode === 'manual' ? manualQuestionCount : randomQuestionCount
      );

      const res =
        distMode === 'manual'
          ? await createManualCustomTest({
              boardId,
              examId,
              name: { en: `Custom Test ${examName} ${istDate}` },
              kind: 'CUSTOM',
              settings: {
                durationMinutes
              },
              questions: manualSelectedRows.length
                ? manualSelectedRows.map((r, idx) => ({ questionId: r.id, order: idx }))
                : Array.from(manualSelectedIds).map((id, idx) => ({ questionId: id, order: idx }))
            })
          : await createRandomCustomTest({
              boardId,
              examId,
              name: {
                en: `Custom Test ${examName} ${istDate}`
              },
              kind: 'CUSTOM',
              settings: {
                durationMinutes
              },
              subjects: data.subjects
            });

      if (!res.success) {
        createTestError = res.message;
        return;
      }

      const newTestId = extractCreatedTestIdFromCreateTestResponse(res.data);
      if (!newTestId) {
        createTestError =
          'Test was created but we could not read its id. Start it from Tests instead.';
        createdTestId = null;
        return;
      }
      createdTestId = newTestId;
      successStartError = null;

      if (distMode === 'manual' && browser) {
        try {
          sessionStorage.removeItem(manualSelectionKey);
        } catch {}
        manualSelectedIds = new Set();
        manualSelectedRows = [];
      }
      distModalOpen = false;
      distSnapshot = null;
      successModalOpen = true;
    } finally {
      creatingTest = false;
    }
  }

  function handleSuccessDoLater() {
    successModalOpen = false;
    createdTestId = null;
    successStartError = null;
    void goto('/student/tests');
  }

  async function handleSuccessStartTest() {
    if (startingOwnSuccessTest) return;
    const testId = createdTestId?.trim();
    if (!testId) {
      successStartError = 'Missing test id. Start this test from your tests list.';
      return;
    }
    successStartError = null;
    startingOwnSuccessTest = true;
    try {
      const batchIdStr = '';
      const attemptRes = await createTestAttempt({ testId, batchId: null });
      if (!attemptRes.success) {
        successStartError = attemptRes.message || 'Could not start test';
        return;
      }
      const persisted = persistBatchAttemptSessionFromCreateResponse(attemptRes.data, {
        testId,
        batchId: batchIdStr,
        testName: examName.trim() ? `Custom Test ${examName}` : 'Custom Test'
      });
      if (!persisted.ok) {
        successStartError = persisted.message;
        return;
      }
      successModalOpen = false;
      createdTestId = null;
      await goto(
        `/student/test-attempt?testId=${encodeURIComponent(testId)}&batchId=${encodeURIComponent(batchIdStr)}`
      );
    } finally {
      startingOwnSuccessTest = false;
    }
  }

</script>

<svelte:head>
  <title>{examName} — Create test · ExamFlow</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    {#if error}
      <div
        class="
        flex items-center gap-3 rounded-2xl px-5 py-4 text-sm
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-[var(--pc-error-text)]
      "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        {error}
      </div>
    {:else if groupedSubjects.length === 0}
      <div class="own-empty-panel">
        <span class="own-empty-panel__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
            <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75" />
            <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
          </svg>
        </span>
        <p class="own-empty-panel__title">No chapters found</p>
        <p class="own-empty-panel__sub">No syllabus data is available for this exam yet.</p>
      </div>
    {:else if isManual}
      <OwnTestChaptersPanelManual
        {groupedSubjects}
        {examSlug}
        examId={examIdFromPage}
        boardId={boardIdFromPage}
      />
      <footer class="own-bottom-bar mt-5" aria-label="Selection summary">
        <div class="own-bottom-bar__subject">
          <span class="own-bottom-bar__label">Selected questions</span>
          {#if manualSelectedCount > 0}
            <ul class="own-bottom-bar__list" role="list">
              {#each manualSelectedSubjectsForBar as s (s.id)}
                <li class="own-bottom-bar__item">
                  <span class="own-bottom-bar__chip">{s.name}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <span class="own-bottom-bar__empty">None selected</span>
          {/if}
        </div>
        <button
          type="button"
          class="btn-cta-subscription btn-cta-subscription--sm ml-auto shrink-0"
          disabled={manualSelectedCount === 0}
          onclick={handleManualNext}
        >
          Next
        </button>
      </footer>
    {:else}
      <OwnTestChaptersPanel
        {groupedSubjects}
        {examSlug}
        examId={examIdFromPage}
        boardId={boardIdFromPage}
        onNext={handleChaptersNext}
      />
    {/if}
  </div>
</div>

<OwnTestQuestionDistributionModal
  open={distModalOpen}
  snapshot={distSnapshot}
  onClose={closeDistModal}
  onContinue={handleDistContinue}
  submitting={creatingTest}
  errorMessage={createTestError}
/>

<OwnTestCreatedSuccessModal
  open={successModalOpen}
  examName={examName}
  starting={startingOwnSuccessTest}
  startError={successStartError}
  onDoLater={handleSuccessDoLater}
  onStartTest={() => void handleSuccessStartTest()}
/>