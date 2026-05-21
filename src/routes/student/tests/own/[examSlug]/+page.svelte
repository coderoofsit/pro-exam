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
  import { notifyError, notifySuccess } from '$lib/notifications';
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

  let {
    data,
    basePath = '/student'
  }: { data: PageData; basePath?: string } = $props();

  const isStudent = $derived(basePath === '/student');

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
  
  // Test Settings State
  let testSettingsOpen = $state(false);
  let customTestName = $state('');
  let customDuration = $state<string>('');
  let customKind = $state('CUSTOM');
  let customStartDate = $state('');
  let customStartTime = $state('');
  let customEndDate = $state('');
  let customEndTime = $state('');
  let startNow = $state(false);
  let noExpiry = $state(false);
  let pendingDistData = $state<OwnTestDistributionContinueData | null>(null);
  let pendingSnapshot = $state<OwnTestSelectionSnapshot | null>(null);

  const isSettingsValid = $derived.by(() => {
    if (!customTestName.trim()) return false;
    if (!customDuration) return false;
    if (!isStudent) {
      if (!startNow && (!customStartDate || !customStartTime)) return false;
      if (!noExpiry && (!customEndDate || !customEndTime)) return false;
    }
    return true;
  });

  const manualSelectionKey = $derived(`own-manual-selected::${examSlug}`);
  const manualSelectedCount = $derived(manualSelectedIds.size);
  const manualValidSelectedCount = $derived(
    manualSelectedRows.filter((r) => String(r.chapterId ?? '').trim().length > 0).length
  );

  const manualSelectedChapterIds = $derived.by(() => {
    const out = new Set<string>();
    for (const r of manualSelectedRows) {
      const id = String(r.chapterId || r.chapterGroupId || '').trim();
      if (id) out.add(id);
    }
    return out;
  });

  const manualSelectedSubjectsForBar = $derived.by(() => {
    const out: { id: string; name: string; accent: number }[] = [];
    if (manualSelectedRows.length === 0) return out;

    for (const [i, row] of groupedSubjects.entries()) {
      let hit = false;
      const rowSubjectId = String(row.subject._id ?? '').trim();
      const rowSubjectSlug = String(row.subject.slug ?? '').trim();

      // Prefer direct subject mapping from session storage when available.
      if (
        manualSelectedRows.some((r) => {
          const selectedSubject = String(r.subjectId ?? '').trim();
          return selectedSubject && (selectedSubject === rowSubjectId || selectedSubject === rowSubjectSlug);
        })
      ) {
        hit = true;
      }

      if (hit) {
        out.push({
          id: row.subject._id,
          name: row.subject.name?.en ?? row.subject.slug,
          accent: i % 4
        });
        continue;
      }

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
          chapterId: String(r?.chapterId ?? '').trim() || String(r?.chapterGroupId ?? '').trim(),
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
      manualSelectedRows.map((r) => String(r.chapterId || r.chapterGroupId || '').trim()).filter(Boolean)
    );
    if (selectedChapterIds.size === 0) return null;

    const subjects: OwnTestSubjectSelection[] = [];

    for (const [i, row] of groupedSubjects.entries()) {
      const units: OwnTestUnitSelection[] = [];

      for (const unit of row.data ?? []) {
        const unitId = String(unit.chapterGroup._id);
        if (!selectedChapterIds.has(unitId)) continue;
        const chapterIds = [unitId];
        units.push({
          unitId,
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
        if (String(unit.chapterGroup._id) === cid) {
          return generateSlug(subjectName);
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
    const selectedChapterIds = new Set();
    const selectedTopicIds = new Set();
    
    if (distMode === 'manual') {
      manualSelectedRows.forEach(r => {
        const cId = String(r.chapterId || r.chapterGroupId || '').trim();
        if (cId) selectedChapterIds.add(cId);
      });
    } else if (pendingDistData) {
      pendingDistData.subjects.forEach(s => {
        s.chapterGroup.forEach(cg => {
          if (cg.numberOfQuestions > 0) {
            selectedChapterIds.add(String(cg.id));
            cg.topics.forEach(t => {
              if (t.numberOfQuestions > 0) selectedTopicIds.add(String(t.id));
            });
          }
        });
      });
    }

    const out: { subjectName: string; chapters: { chapterName: string; topicNames: string[] }[] }[] = [];
    for (const row of groupedSubjects) {
      const chaptersOut: { chapterName: string; topicNames: string[] }[] = [];
      for (const unit of row.data ?? []) {
        if (!selectedChapterIds.has(String(unit.chapterGroup._id))) continue;
        
        const topicNames: string[] = [];
        for (const topic of unit.data ?? []) {
          if (distMode === 'manual' || selectedTopicIds.has(String(topic._id))) {
            topicNames.push(topic.name?.en ?? topic.slug);
          }
        }
        if (topicNames.length > 0) {
          chaptersOut.push({ 
            chapterName: unit.chapterGroup.name?.en ?? unit.chapterGroup.slug, 
            topicNames 
          });
        }
      }
      if (chaptersOut.length > 0) {
        out.push({ subjectName: row.subject.name?.en ?? row.subject.slug, chapters: chaptersOut });
      }
    }
    return out;
  });

  /** Toast + inline error for create-test API only (manual & random). */
  function setCreateTestError(message: string) {
    createTestError = message;
    notifyError(message);
  }

  function notifyCreateTestSuccess(message?: string | null) {
    const modeLabel = distMode === 'random' ? 'Random' : 'Manual';
    notifySuccess(message?.trim() || `${modeLabel} test created successfully.`);
  }

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
      setCreateTestError('Please select at least one question before continuing.');
      return;
    }

    distMode = 'manual';
    pendingSnapshot = buildManualSnapshot();
    customTestName = `Custom Test ${examName} ${formatIstDateDdMmYyyy()}`;
    customDuration = String(durationMinutesForQuestionCount(manualSelectedCount));
    testSettingsOpen = true;
  }

  function formatDatePickerToBackend(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  }

  async function executeCreate() {
    createTestError = null;
    manualBgCreatedTestId = null;
    manualBgCreatePending = true;
    manualBgCreateRequestGen++;
    const gen = manualBgCreateRequestGen;

    const istDate = formatIstDateDdMmYyyy();
    const boardId = (pendingSnapshot?.boardId || boardIdFromPage)?.trim();
    const examId = (pendingSnapshot?.examId || examIdFromPage)?.trim();

    if (!boardId || !examId) {
      setCreateTestError('Missing exam or board information.');
      manualBgCreatePending = false;
      return;
    }

    // Switch modals immediately
    testSettingsOpen = false;
    manualConfirmModalOpen = true;

    void (async () => {
      try {
        let res: Awaited<ReturnType<typeof createManualCustomTest>>;
        
        if (distMode === 'manual') {
          const payload = buildManualCreatePayload();
          if (payload) {
            payload.name.en = customTestName;
            payload.kind = customKind;
            payload.settings.durationMinutes = parseInt(customDuration) || payload.settings.durationMinutes;
            
            if (!isStudent) {
              if (!startNow) {
                (payload.settings as any).startDate = formatDatePickerToBackend(customStartDate);
                (payload.settings as any).startTime = customStartTime;
              }
              if (!noExpiry) {
                (payload.settings as any).endDate = formatDatePickerToBackend(customEndDate);
                (payload.settings as any).endTime = customEndTime;
              }
            }
            
            res = await createManualCustomTest(payload);
          } else {
            throw new Error('Could not build manual payload');
          }
        } else {
          if (!pendingDistData) throw new Error('Missing distribution data');
          const settings: any = { durationMinutes: parseInt(customDuration) || 1 };
          
          if (!isStudent) {
            if (!startNow) {
              settings.startDate = formatDatePickerToBackend(customStartDate);
              settings.startTime = customStartTime;
            }
            if (!noExpiry) {
              settings.endDate = formatDatePickerToBackend(customEndDate);
              settings.endTime = customEndTime;
            }
          }

          res = await createRandomCustomTest({
            boardId,
            examId,
            examSlug,
            name: { en: customTestName },
            kind: customKind,
            settings,
            subjects: pendingDistData.subjects
          });
        }

        if (gen !== manualBgCreateRequestGen) return;
        if (!res.success) {
          setCreateTestError(res.message || 'Failed to create test.');
          return;
        }
        const newTestId = extractCreatedTestIdFromCreateTestResponse(res.data);
        if (!newTestId) {
          setCreateTestError('Test created but ID not found.');
          return;
        }
        manualBgCreatedTestId = newTestId;
        notifyCreateTestSuccess(res.message);
      } catch (e) {
        if (gen !== manualBgCreateRequestGen) return;
        setCreateTestError(e instanceof Error ? e.message : 'Something went wrong');
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
    distMode = 'random';
    pendingSnapshot = snapshot;
    pendingDistData = data;
    
    const count = totalQuestionsFromDistributionPayload(data);
    customTestName = `Custom Test ${examName} ${formatIstDateDdMmYyyy()}`;
    customDuration = String(durationMinutesForQuestionCount(count));
    
    distModalOpen = false;
    testSettingsOpen = true;
  }

  function handleSuccessDoLater() {
    successModalOpen = false;
    createdTestId = null;
    successStartError = null;
    void goto(`${basePath}/tests`);
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
        `${basePath}/test-attempt?testId=${encodeURIComponent(testId)}&batchId=${encodeURIComponent(batchIdStr)}&prelaunch=1&testName=${encodeURIComponent(examName)}`
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
      <BackButton
        label="Back"
        className="ml-2"
        useHistory={false}
        onClick={() => void goto(`${basePath}/tests/own?mode=manual`)}
      />
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
        {basePath}
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
  isStudent={isStudent}
  onDoLater={handleSuccessDoLater}
  onStartTest={() => void handleSuccessStartTest()}
/>

{#if testSettingsOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
    <div class="w-full max-w-lg rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6 shadow-xl">
      <h2 class="text-xl font-bold text-[var(--page-text)]">Test Settings</h2>
      
      <div class="mt-6 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">Test Name</span>
          <input
            type="text"
            class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)]"
            placeholder="Enter test name"
            bind:value={customTestName}
          />
        </label>

        {#if !isStudent}
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">Type</span>
            <select
              class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)]"
              bind:value={customKind}
            >
              <option value="PRACTICE">Practice</option>
              <option value="MOCK">Mock</option>
              <option value="SECTIONAL">Sectional</option>
              <option value="CHAPTERWISE">Chapterwise</option>
              <option value="CUSTOM">Custom</option>
              <option value="PREVIOUSYEAR">Previous Year</option>
            </select>
          </label>
        {/if}

        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">Duration (minutes)</span>
          <input
            type="number"
            min="1"
            class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)]"
            placeholder="e.g. 60"
            bind:value={customDuration}
          />
        </label>

        {#if !isStudent}
          <div class="space-y-4 pt-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="startNow" class="h-4 w-4 accent-[var(--page-link)]" bind:checked={startNow} />
              <label for="startNow" class="text-xs font-bold uppercase tracking-wider text-[var(--page-text)] cursor-pointer">Start Now</label>
            </div>
            <div class="grid grid-cols-2 gap-4" class:opacity-50={startNow}>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">Start Date</span>
                <input
                  type="date"
                  class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)] disabled:cursor-not-allowed"
                  bind:value={customStartDate}
                  disabled={startNow}
                />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">Start Time</span>
                <input
                  type="time"
                  class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)] disabled:cursor-not-allowed"
                  bind:value={customStartTime}
                  disabled={startNow}
                />
              </label>
            </div>
          </div>

          <div class="space-y-4 pt-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="noExpiry" class="h-4 w-4 accent-[var(--page-link)]" bind:checked={noExpiry} />
              <label for="noExpiry" class="text-xs font-bold uppercase tracking-wider text-[var(--page-text)] cursor-pointer">No Expiry date</label>
            </div>
            <div class="grid grid-cols-2 gap-4" class:opacity-50={noExpiry}>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">End Date</span>
                <input
                  type="date"
                  class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)] disabled:cursor-not-allowed"
                  bind:value={customEndDate}
                  disabled={noExpiry}
                />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-[var(--page-text-muted)]">End Time</span>
                <input
                  type="time"
                  class="w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--page-text)] outline-none focus:border-[var(--page-link)] disabled:cursor-not-allowed"
                  bind:value={customEndTime}
                  disabled={noExpiry}
                />
              </label>
            </div>
          </div>
        {/if}
      </div>

      {#if createTestError}
        <p class="mt-4 text-sm text-[var(--pc-error-text)] bg-[var(--pc-error-bg)] p-3 rounded-lg border border-[var(--pc-error-border)]">
          {createTestError}
        </p>
      {/if}

      <div class="mt-8 flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] py-3 text-sm font-bold text-[var(--page-text)] transition hover:bg-[var(--page-card-border)]"
          onclick={() => { testSettingsOpen = false; createTestError = null; }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl bg-[var(--page-link)] py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={executeCreate}
          disabled={!isSettingsValid}
        >
          Create Test
        </button>
      </div>
    </div>
  </div>
{/if}

{#if manualConfirmModalOpen}
  <div class="own-manual-confirm-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
    <div class="w-full max-w-lg rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6 shadow-xl">
      <h2 class="text-xl font-bold text-[var(--page-text)]">Create Tests</h2>
      <p class="mt-3 text-sm text-[var(--page-text-muted)]">
        Duration: {customDuration} minutes
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
        <button type="button" class="h-9 min-w-[6.5rem] shrink-0 rounded-xl border border-[var(--page-link)] bg-[color-mix(in_srgb,var(--page-link)_18%,var(--sh-exam-card-arrow-bg))] px-4 text-sm font-medium text-[var(--page-link)] transition-all duration-150 hover:border-[var(--page-link)] hover:bg-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-arrow-bg))] disabled:cursor-not-allowed disabled:opacity-50" onclick={handleManualConfirmOk}>
          OK
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure blur works in production for this page (component-scoped override). */
  :global(.own-manual-confirm-overlay) {
    background: rgba(0, 0, 0, 0.55) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
  }

</style>