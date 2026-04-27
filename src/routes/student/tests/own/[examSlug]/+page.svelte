<script lang="ts">
  import type { PageData } from './$types';
  import OwnTestChaptersPanelRandom from '$lib/components/OwnTestChaptersPanelRandom.svelte';
  import OwnTestChaptersPanelManual from '$lib/components/OwnTestChaptersPanelManual.svelte';
  import OwnTestCreatedSuccessModal from '$lib/components/OwnTestCreatedSuccessModal.svelte';
  import OwnTestQuestionDistributionModalRandom from '$lib/components/OwnTestQuestionDistributionModalRandom.svelte';
  import OwnTestSyllabusSkeleton from '$lib/components/OwnTestSyllabusSkeleton.svelte';
  import {
    createManualCustomTest,
    createRandomCustomTest,
    extractCreatedTestIdFromCreateTestResponse,
    type CreateManualCustomTestBody
  } from '$lib/api/tests';
  import { createTestAttempt, persistBatchAttemptSessionFromCreateResponse } from '$lib/api/testAttempts';
  import { goto } from '$app/navigation';
  import BackButton from '$lib/components/BackButton.svelte';
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
  import { generateSlug } from '$lib/utils/generateSlug';
  import { page } from '$app/state';

  let { data }: { data: PageData } = $props();

  // Handle streamed data
  let topicsResponse = $state<any>(null);
  let isLoading = $state(true);

  $effect(() => {
    void data.streamed.topicsResponse.then((res) => {
      topicsResponse = res;
      isLoading = false;
    });
  });

  const rawSubjects = $derived(topicsResponse?.data?.data ?? []);
  const examIdFallback = $derived((rawSubjects[0]?.subject?.examId ?? '').trim());
  const boardIdFallback = $derived((rawSubjects[0]?.subject?.boardId ?? '').trim());

  const groupedSubjects = $derived.by(() => {
    return rawSubjects.map((row) => ({
      examId: (row.subject.examId ?? '').trim() || examIdFallback,
      boardId: (row.subject.boardId ?? '').trim() || boardIdFallback,
      subject: {
        _id: row.subject._id,
        slug: row.subject.slug,
        name: row.subject.name || { en: row.subject.slug }
      },
      data: (row.data ?? []).map((chRow) => ({
        chapterGroup: {
          _id: chRow.chapter._id,
          slug: chRow.chapter.slug,
          name: chRow.chapter.name || { en: chRow.chapter.slug },
          order: chRow.chapter.order
        },
        data: (chRow.data ?? []).map((topicRow) => ({
          _id: topicRow._id,
          slug: topicRow.topicSlug,
          name: topicRow.topic || { en: topicRow.topicSlug },
          numberOfQuestions: topicRow.numberOfQuestions,
          order: topicRow.order
        }))
      }))
    }));
  });

  const randomModeData = $derived.by(() => {
    return groupedSubjects.map((s) => ({
      subject: s.subject,
      data: (s.data ?? []).map((u) => ({
        chapter: u.chapterGroup,
        data: (u.data ?? []).map((t) => ({
          _id: t._id,
          topicSlug: t.slug,
          topic: t.name,
          numberOfQuestions: t.numberOfQuestions || 0,
          order: t.order
        }))
      }))
    })) as any[];
  });

  const error = $derived(topicsResponse?.success === false ? topicsResponse.message : null);
  const topicsError = $derived(topicsResponse?.success === false ? topicsResponse.message : null);
  const examSlug = $derived(data.examSlug ?? '');
  const examIdFromPage = $derived(examIdFallback || '');
  const boardIdFromPage = $derived(boardIdFallback || '');

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
  type ManualSelectedRow = {
    id: string;
    subjectId: string;
    chapterId: string;
    chapterGroupId: string;
    questionText?: string;
  };
  let manualSelectedIds = $state<Set<string>>(new Set());
  let manualSelectedRows = $state<ManualSelectedRow[]>([]);
  let manualConfirmModalOpen = $state(false);
  /** Background create started from Next; OK stays loading until resolved. */
  let manualBgCreatePending = $state(false);
  /** Set when POST /tests succeeds; user must click OK to open success modal. */
  let manualBgCreatedTestId = $state<string | null>(null);
  let manualBgCreateRequestGen = $state(0);

  const manualSelectionKey = $derived(`own-manual-selected::${examSlug}`);
  const manualSelectedCount = $derived(manualSelectedIds.size);
  const manualValidSelectedCount = $derived(
    manualSelectedRows.filter((r) => String(r.chapterId ?? '').trim().length > 0).length
  );

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
        if (manualSelectedChapterIds.has(String(unit.chapterGroup._id))) {
          hit = true;
          break;
        }
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
        manualSelectedRows = ids.map((id) => ({
          id,
          subjectId: '',
          chapterId: '',
          chapterGroupId: ''
        }));
        manualSelectedIds = new Set(ids);
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({
          id: String(r?.id ?? ''),
          subjectId: String(r?.subjectId ?? '').trim(),
          chapterId: String(r?.chapterId ?? '').trim(),
          chapterGroupId: String(r?.chapterGroupId ?? '').trim(),
          questionText: String(r?.questionText ?? '').trim()
        }))
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
        chapters: [],
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

  /** Section slug is derived from the **subject** name (not unit). */
  function findSubjectSectionSlugForChapter(chapterId: string, subjectId?: string): string | null {
    const cid = String(chapterId).trim();
    const sid = String(subjectId ?? '').trim();
    if (!cid) return null;
    if (sid) {
      const matched = groupedSubjects.find((g) => String(g.subject._id) === sid);
      if (matched) {
        const subjectName = matched.subject.name?.en ?? matched.subject.slug;
        return generateSlug(subjectName);
      }
    }
    for (const row of groupedSubjects) {
      const subjectName = row.subject.name?.en ?? row.subject.slug;
      for (const unit of row.data ?? []) {
        for (const ch of unit.data ?? []) {
          if (String(ch._id) === cid) {
            return generateSlug(subjectName);
          }
        }
      }
    }
    return null;
  }

  function fallbackManualSectionInfo(): { slug: string; title: string } {
    const fromQuery = String(page.url.searchParams.get('subject') ?? '').trim();
    const bySlug = groupedSubjects.find((g) => g.subject.slug === fromQuery);
    if (bySlug) {
      const title = bySlug.subject.name?.en ?? bySlug.subject.slug;
      return { slug: generateSlug(title), title };
    }
    const first = groupedSubjects[0];
    if (first) {
      const title = first.subject.name?.en ?? first.subject.slug;
      return { slug: generateSlug(title), title };
    }
    return { slug: 'selected-questions', title: 'Selected Questions' };
  }

  function buildManualCreatePayload(): CreateManualCustomTestBody | null {
    const istDate = formatIstDateDdMmYyyy();
    const boardId = String(boardIdFromPage ?? '').trim();
    const examId = String(examIdFromPage ?? '').trim();
    if (!boardId || !examId) return null;

    const rows = manualSelectedRows.length
      ? manualSelectedRows
      : Array.from(manualSelectedIds).map((id) => ({
          id,
          subjectId: '',
          chapterId: '',
          chapterGroupId: ''
        }));
    if (rows.length === 0) return null;

    const manualQuestionCount = rows.length;
    const durationMinutes = durationMinutesForQuestionCount(manualQuestionCount);

    const fallbackSection = fallbackManualSectionInfo();
    const sectionCounts = new Map<string, { title: string; numberOfQuestions: number }>();

    const questions = rows.map((r, idx) => {
      const sectionSlug =
        findSubjectSectionSlugForChapter(
          String(r.chapterId).trim(),
          String(r.subjectId ?? '').trim()
        ) ?? fallbackSection.slug;
      const title =
        groupedSubjects
          .map((g) => {
            const name = g.subject.name?.en ?? g.subject.slug;
            return { slug: generateSlug(name), title: name };
          })
          .find((s) => s.slug === sectionSlug)?.title ?? fallbackSection.title;
      const prev = sectionCounts.get(sectionSlug);
      sectionCounts.set(sectionSlug, {
        title,
        numberOfQuestions: (prev?.numberOfQuestions ?? 0) + 1
      });
      return {
      questionId: r.id,
      order: idx,
      sectionSlug
      };
    });

    const sections: CreateManualCustomTestBody['sections'] = Array.from(sectionCounts.entries()).map(
      ([slug, info], idx) => ({
        title: info.title,
        slug,
        numberOfQuestions: info.numberOfQuestions,
        order: idx + 1
      })
    );

    return {
      boardId,
      examId,
      examSlug,
      name: { en: `Custom Test ${examName} ${istDate}` },
      kind: 'CUSTOM',
      settings: { durationMinutes },
      sections,
      questions
    };
  }

  const manualConfirmHierarchy = $derived.by(() => {
    const selectedChapterIds = new Set(
      manualSelectedRows.map((r) => String(r.chapterId || '').trim()).filter(Boolean)
    );
    const out: { subjectName: string; chapters: { chapterName: string; topicNames: string[] }[] }[] = [];
    for (const row of groupedSubjects) {
      const subjectName = row.subject.name?.en ?? row.subject.slug;
      const chaptersOut: { chapterName: string; topicNames: string[] }[] = [];
      for (const unit of row.data ?? []) {
        const chapterName = unit.chapterGroup.name?.en ?? unit.chapterGroup.slug;
        const topicNames: string[] = [];
        for (const ch of unit.data ?? []) {
          // Note: In manual mode, chapterId stored in row is actually the Chapter ID,
          // but we are selecting topics. Wait, the chapter page stores the Chapter ID.
          // So selecting any topic in a chapter will highlight that chapter.
          if (selectedChapterIds.has(String(unit.chapterGroup._id))) {
             // Wait, if I select a question, it stores the chapterId.
             // I need to check if the question belongs to this topic.
             // But our manualSelectedRows only has {id, chapterId}.
             // So we can only reliably show selection at the Chapter level.
             // Actually, the current logic shows chapterNames.
             topicNames.push(ch.name?.en ?? ch.slug);
          }
        }
        if (topicNames.length === 0) continue;
        chaptersOut.push({ chapterName, topicNames });
      }
      if (chaptersOut.length === 0) continue;
      out.push({ subjectName, chapters: chaptersOut });
    }
    return out;
  });

  function finishManualCreateSuccess(newTestId: string) {
    createdTestId = newTestId;
    successStartError = null;
    if (browser) {
      try {
        sessionStorage.removeItem(manualSelectionKey);
      } catch {}
      manualSelectedIds = new Set();
      manualSelectedRows = [];
    }
    manualConfirmModalOpen = false;
    manualBgCreatedTestId = null;
    successModalOpen = true;
  }

  function handleManualNext() {
    if (manualConfirmModalOpen) return;
    createTestError = null;
    manualBgCreatedTestId = null;
    const payload = buildManualCreatePayload();
    if (!payload) {
      createTestError = 'Please select at least one question before continuing.';
      return;
    }

    manualConfirmModalOpen = true;
    manualBgCreatePending = true;
    manualBgCreateRequestGen++;
    const gen = manualBgCreateRequestGen;

    void (async () => {
      try {
        const res = await createManualCustomTest(payload);
        if (gen !== manualBgCreateRequestGen) return;
        if (!res.success) {
          createTestError = res.message;
          return;
        }
        const newTestId = extractCreatedTestIdFromCreateTestResponse(res.data);
        if (!newTestId) {
          createTestError =
            'Test was created but we could not read its id. Start it from Tests instead.';
          return;
        }
        manualBgCreatedTestId = newTestId;
      } catch (e) {
        if (gen !== manualBgCreateRequestGen) return;
        createTestError = e instanceof Error ? e.message : 'Something went wrong';
      } finally {
        if (gen === manualBgCreateRequestGen) {
          manualBgCreatePending = false;
        }
      }
    })();
  }

  function handleManualConfirmOk() {
    if (manualBgCreatePending) return;
    if (createTestError) {
      manualConfirmModalOpen = false;
      createTestError = null;
      manualBgCreatedTestId = null;
      manualBgCreateRequestGen++;
      return;
    }
    const tid = manualBgCreatedTestId?.trim();
    if (!tid) return;
    finishManualCreateSuccess(tid);
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

      let res: Awaited<ReturnType<typeof createManualCustomTest>>;
      if (distMode === 'manual') {
        const manualPayload = buildManualCreatePayload();
        if (!manualPayload) {
          createTestError =
            'Missing exam or board for this test. Please refresh the page or pick another exam.';
          return;
        }
        res = await createManualCustomTest(manualPayload);
      } else {
        res = await createRandomCustomTest({
          boardId,
          examId,
          examSlug,
          name: {
            en: `Custom Test ${examName} ${istDate}`
          },
          kind: 'CUSTOM',
          settings: {
            durationMinutes
          },
          subjects: data.subjects
        });
      }

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
  <title>{examName} — Create test · Exam Abhyas</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
    <div class="mb-4 flex justify-start">
      <BackButton label="Back" className="ml-2" onClick={() => void goto('/student/tests/own?mode=manual')} />
    </div>
    {#if isLoading}
      <OwnTestSyllabusSkeleton />
    {:else if error}
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
    {:else if (isManual ? groupedSubjects.length === 0 : randomModeData.length === 0)}
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
        <p class="own-empty-panel__title">{isManual ? 'No chapters found' : 'No topics found'}</p>
        <p class="own-empty-panel__sub">
          {isManual
            ? 'No syllabus data is available for this exam yet.'
            : (topicsError ?? 'No topics data is available for this exam yet.')}
        </p>
      </div>
    {:else if isManual}
      <OwnTestChaptersPanelManual
        {groupedSubjects}
        {examSlug}
        examId={examIdFromPage}
        boardId={boardIdFromPage}
      />
      <footer class="own-bottom-bar" aria-label="Selection summary">
        {#if createTestError}
          <div class="mb-3 rounded-lg border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-2 text-sm text-[var(--pc-error-text)]">
            {createTestError}
          </div>
        {/if}
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
          class="ml-auto h-9 min-w-[6.5rem] shrink-0 rounded-xl border border-[var(--page-link)] bg-[color-mix(in_srgb,var(--page-link)_18%,var(--sh-exam-card-arrow-bg))] px-4 text-sm font-medium text-[var(--page-link)] transition-all duration-150 hover:border-[var(--page-link)] hover:bg-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-arrow-bg))] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={manualSelectedCount === 0 || manualConfirmModalOpen}
          onclick={handleManualNext}
        >
          Next
        </button>
      </footer>
    {:else}
      <OwnTestChaptersPanelRandom
        groupedSubjects={randomModeData}
        {examSlug}
        examId={examIdFromPage}
        boardId={boardIdFromPage}
        onNext={handleChaptersNext}
      />
    {/if}
  </div>
</div>

<OwnTestQuestionDistributionModalRandom
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

{#if manualConfirmModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-lg rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6 shadow-xl">
      <h2 class="text-xl font-bold text-[var(--page-text)]">Create Test</h2>
      <p class="mt-3 text-sm text-[var(--page-text-muted)]">
        Duration: {durationMinutesForQuestionCount(manualSelectedCount)} minutes
      </p>

      <div class="mt-5 max-h-[min(52vh,26rem)] space-y-6 overflow-y-auto pr-1 text-sm text-[var(--page-text)]">
        {#each manualConfirmHierarchy as subj (subj.subjectName)}
          <section class="space-y-3">
            <h3 class="text-base font-bold tracking-tight text-[var(--page-text)]">
              {subj.subjectName}
            </h3>
            <div class="space-y-2.5">
              {#each subj.chapters as c (c.chapterName + subj.subjectName)}
                <div
                  class="rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 shadow-sm"
                >
                  <p class="text-xs font-semibold uppercase tracking-wide text-[var(--page-text-muted)]">
                    {c.chapterName}
                  </p>
                  <p class="mt-2 text-sm leading-relaxed text-[var(--page-text)]">
                    {c.topicNames.join(', ')}
                  </p>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>

      {#if createTestError}
        <div class="mt-4 rounded-lg border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-2 text-sm text-[var(--pc-error-text)]">
          {createTestError}
        </div>
      {/if}

      <div class="mt-6 flex justify-center">
        <button type="button" class="btn-cta-subscription min-w-[8rem]" onclick={handleManualConfirmOk}>
          OK
        </button>
      </div>
    </div>
  </div>
{/if}