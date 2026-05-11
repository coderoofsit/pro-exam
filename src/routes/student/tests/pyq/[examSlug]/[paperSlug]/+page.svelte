<script lang="ts">
import { tick } from 'svelte';
  import { browser } from '$app/environment';
  import type { PageData } from './$types';
  import { updateQuestion, updateQuestionApproveStatus } from '$lib/api/questions';
  import { createReport, type ReportReason } from '$lib/api/reports';
  import MathText from '$lib/components/MathText.svelte';
  import BackButton from '$lib/components/BackButton.svelte';
  import { questionPromptEnContent, uploadImage } from '$lib/api/questions';
  import { 
    BATCH_TEST_ATTEMPT_STORAGE_KEY, 
    createTestAttempt, 
    peelTestAttemptEnvelope, 
    findAttemptIdInApiResponse,
    persistBatchAttemptSessionFromCreateResponse 
  } from '$lib/api/testAttempts';
  import { ATTEMPT_START_ERROR_KEY } from '$lib/student/testAttempt/loadAttemptFromSession';
  import { goto } from '$app/navigation';

  let { data, isReadOnly = false }: { data: PageData; isReadOnly?: boolean } = $props();

  const examSlug = $derived(data.examSlug ?? '');
  
  let questions = $state<Array<Record<string, any>>>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);

  let fetchedSections = $state<Record<string, Array<Record<string, any>>>>({});
  let subjectTabs = $state<string[]>([]);
  let activeTab = $state<string>('');
  let showOptions = $state(false);
  let openSolutionQuestionId = $state<string | null>(null);
  let isTabSwitching = $state(false);

  let paperDetails = $state<any>(null);
  let startingPaperId = $state<string | null>(null);
  let startingTestError = $state<string | null>(null);

  $effect(() => {
    data.streamed.paperDetailsPromise.then(res => {
      paperDetails = res;
    });
  });

  async function handleStartPaperTest(details: any, options?: { testAttemptId?: string | null }) {
    if (startingPaperId) return;
    const testId = (details?.testId ?? '').trim();
    if (!testId) {
      startingTestError = 'Test id is missing for this paper.';
      return;
    }
    startingTestError = null;
    startingPaperId = details._id;
    
    // Clear any previous errors from session storage before starting
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(ATTEMPT_START_ERROR_KEY);
      sessionStorage.removeItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
    }

    // Trigger the API in the background
    createTestAttempt({ 
      testId, 
      batchId: null,
      testAttemptId: options?.testAttemptId ?? null 
    }).then(res => {
      if (!res.success) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(ATTEMPT_START_ERROR_KEY, res.message || 'Could not start test');
        }
        return;
      }
      persistBatchAttemptSessionFromCreateResponse(res.data, {
        testId,
        batchId: '',
        testName: details.name
      });
    }).catch(err => {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(ATTEMPT_START_ERROR_KEY, err.message || 'An error occurred while starting the test');
      }
    });

    // Redirect immediately
    await goto(`/student/test-attempt?testId=${encodeURIComponent(testId)}&batchId=&prelaunch=1&testName=${encodeURIComponent(details.name)}`);
  }

  function handleViewAnalysis(details: any) {
    const aid = (details?.testAttemptedId ?? '').trim();
    if (!aid) return;
    goto(`/student/tests/analysis/${encodeURIComponent(aid)}?testName=${encodeURIComponent(details.name)}`);
  }

  $effect(() => {
    isLoading = true;
    data.streamed.questionsPromise.then((res: any) => {
      if (res.success) {
        const payload = res.data?.data || res.data; // fallback in case api wrapper changes
        const sections = payload?.sections ?? [];
        const loadedQuestions = payload?.questions ?? [];
        
        subjectTabs = sections;
        const currentSubject = data.subjectSlug || sections[0] || '';
        activeTab = currentSubject;
        
        if (currentSubject) {
          fetchedSections[currentSubject] = loadedQuestions;
          questions = loadedQuestions;
        }
        error = null;
      } else {
        questions = [];
        subjectTabs = [];
        error = res.message || 'Failed to fetch paper questions.';
      }
    }).catch((err) => {
      error = err.message || 'An error occurred while fetching questions.';
    }).finally(() => {
      isLoading = false;
    });
  });

  async function selectTab(tab: string) {
  // Do not allow another click while tab switch is in progress
  if (isTabSwitching) return;

  // Do nothing if same tab is clicked
  if (activeTab === tab) return;

  isTabSwitching = true;
  error = null;

  try {
    activeTab = tab;
    openSolutionQuestionId = null;

    // Update URL without full navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('subject', tab);
      window.history.replaceState({}, '', url);
    }

    // If section is already cached, use it directly
    if (fetchedSections[tab]) {
      questions = fetchedSections[tab];

      // Wait for Svelte DOM update
      await tick();
      return;
    }

    // Fetch new section
    isLoading = true;

    const { getPaperQuestionsByPaperId } = await import('$lib/api/paper');
    const res = await getPaperQuestionsByPaperId(data.paperSlug, fetch, tab);

    if (res.success) {
      const payload = res.data?.data || res.data;
      const loadedQuestions = payload?.questions ?? [];

      fetchedSections[tab] = loadedQuestions;
      questions = loadedQuestions;
      error = null;

      // Wait for Svelte DOM update after questions are assigned
      await tick();
    } else {
      questions = [];
      error = res.message || 'Failed to fetch section questions.';
    }
  } catch (err: any) {
    questions = [];
    error = err.message || 'An error occurred while fetching section.';
  } finally {
    isLoading = false;

    // Let the UI finish one more update before enabling tabs again
    await tick();

    isTabSwitching = false;
  }
}

  function toggleSolution(questionId: string) {
    openSolutionQuestionId = openSolutionQuestionId === questionId ? null : questionId;
  }


  const activeQuestions = $derived(questions);

  let editingQuestionId = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  let editingQuestionKind = $state<'MCQ' | 'MSQ' | 'INTEGER' | 'FILLS'>('MCQ');
  let draftContent = $state('');
  let draftExplanation = $state('');
  let draftRePhrasedExplanation = $state('');
  let draftOptions = $state<Array<{ 
    identifier: string; 
    content: string; 
    images: string[]; 
    rePhrasedOptionImage: string[] 
  }>>([]);
  let draftCorrectIdentifiers = $state<string[]>([]);
  let draftFills = $state<string[]>([]);
  let draftInteger = $state('');
  let draftImages = $state<string[]>([]);
  let draftExplanationImages = $state<string[]>([]);
  let draftRePhrasedQuestionImages = $state<string[]>([]);
  let draftRePhrasedExplanationImages = $state<string[]>([]);
  let reportModalOpen = $state(false);
  let reportingQuestionId = $state('');
  let reportReason = $state<ReportReason>('WRONG_QUESTION');
  const reportReasonOptions: { value: ReportReason; label: string }[] = [
    { value: 'WRONG_QUESTION', label: 'Wrong Question' },
    { value: 'WRONG_ANSWER', label: 'Wrong Answer' },
    { value: 'WRONG_SOLUTION', label: 'Wrong Solution' },
    { value: 'TYPO', label: 'Typo / Spelling error' },
    { value: 'BAD_LATEX', label: 'Math Formatting (LaTeX) issue' },
    { value: 'MISSING_IMAGE', label: 'Missing Image' },
    { value: 'WRONG_OPTIONS', label: 'Incorrect Options' },
    { value: 'DUPLICATE', label: 'Duplicate Question' },
    { value: 'OTHER', label: 'Other' }
  ];
  let reportReasonDropdownOpen = $state(false);
  let reportReasonDropdownRef = $state<HTMLElement | null>(null);
  let reportMessage = $state('');
  let isSubmittingReport = $state(false);
  let reportFeedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);

  const examName = $derived.by(() =>
    examSlug
      .split('-')
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );

  function startEdit(q: Record<string, any>) {
    editingQuestionId = String(q?._id ?? '');
    saveError = null;
    draftContent = String(q?.prompt?.en?.content ?? '');
    draftExplanation = String(q?.prompt?.en?.explanation ?? '');
    draftRePhrasedExplanation = String(q?.prompt?.en?.rePhrasedExplanation ?? '');
    const options = Array.isArray(q?.prompt?.en?.options) ? q.prompt.en.options : [];
    const kindRaw = String(q?.kind ?? '').toUpperCase();
    editingQuestionKind =
      kindRaw === 'MSQ' || kindRaw === 'MCQ' || kindRaw === 'INTEGER'
        ? (kindRaw as any)
        : (options.length > 0 ? 'MCQ' : 'FILLS');
    draftOptions = options.map((opt: any) => ({
      identifier: String(opt?.identifier ?? '').trim(),
      content: String(opt?.content ?? '').trim(),
      images: Array.isArray(opt?.images) && opt.images.length ? opt.images.map((img: any) => img.url).filter(Boolean) : [''],
      rePhrasedOptionImage: Array.isArray(opt?.rePhrasedOptionImage) && opt.rePhrasedOptionImage.length ? opt.rePhrasedOptionImage.map((img: any) => img.url).filter(Boolean) : ['']
    }));
    draftCorrectIdentifiers = Array.isArray(q?.correct?.identifiers)
      ? q.correct.identifiers.map((x: unknown) => String(x ?? '').trim()).filter(Boolean)
      : [];
    draftFills = Array.isArray(q?.correct?.fills)
      ? q.correct.fills.map((x: unknown) => String(x ?? '').trim())
      : [];
    draftInteger =
      typeof q?.correct?.integer === 'number' || typeof q?.correct?.integer === 'string'
        ? String(q.correct.integer)
        : '';
    const imgs = Array.isArray(q?.prompt?.en?.images) ? q.prompt.en.images.map((img: any) => img.url).filter(Boolean) : [];
    draftImages = imgs.length ? imgs : [''];
    
    const expImgs = Array.isArray(q?.prompt?.en?.explanationImages) ? q.prompt.en.explanationImages.map((img: any) => img.url).filter(Boolean) : [];
    draftExplanationImages = expImgs.length ? expImgs : [''];
    
    const rpQImgs = Array.isArray(q?.prompt?.en?.rePhrasedQuestionImage) ? q.prompt.en.rePhrasedQuestionImage.map((img: any) => img.url).filter(Boolean) : [];
    draftRePhrasedQuestionImages = rpQImgs.length ? rpQImgs : [''];
    
    const rpExpImgs = Array.isArray(q?.prompt?.en?.rePhrasedImage) ? q.prompt.en.rePhrasedImage.map((img: any) => img.url).filter(Boolean) : [];
    draftRePhrasedExplanationImages = rpExpImgs.length ? rpExpImgs : [''];
  }

  let isUploadingImage = $state(false);

  async function handleImageUpload(e: Event, updateFn: (url: string) => void) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    isUploadingImage = true;
    saveError = null;
    try {
      const url = await uploadImage(file);
      updateFn(url);
    } catch (err: any) {
      saveError = err.message || 'Failed to upload image';
    } finally {
      isUploadingImage = false;
      input.value = '';
    }
  }

  function cancelEdit() {
    editingQuestionId = null;
    saveError = null;
  }

  async function saveEdit(questionId: string) {
    saveError = null;
    try {
      const options = draftOptions
        .map((opt) => ({
          identifier: String(opt.identifier ?? '').trim(),
          content: String(opt.content ?? '').trim(),
          images: opt.images.map(url => ({ url })),
          rePhrasedOptionImage: opt.rePhrasedOptionImage.map(url => ({ url }))
        }))
        .filter((opt) => opt.identifier && opt.content);

      const identifiers =
        editingQuestionKind === 'MCQ'
          ? draftCorrectIdentifiers.slice(0, 1)
          : editingQuestionKind === 'MSQ'
            ? draftCorrectIdentifiers
            : [];

      const payload = {
        kind: editingQuestionKind,
        prompt: {
          en: {
            content: draftContent,
            explanation: draftExplanation,
            rePhrasedExplanation: draftRePhrasedExplanation,
            images: draftImages.filter(Boolean).map(url => ({ url })),
            rePhrasedQuestionImage: draftRePhrasedQuestionImages.filter(Boolean).map(url => ({ url })),
            explanationImages: draftExplanationImages.filter(Boolean).map(url => ({ url })),
            rePhrasedImage: draftRePhrasedExplanationImages.filter(Boolean).map(url => ({ url })),
            options: editingQuestionKind === 'MCQ' || editingQuestionKind === 'MSQ' ? draftOptions.map(opt => ({
              identifier: String(opt.identifier ?? '').trim(),
              content: String(opt.content ?? '').trim(),
              images: opt.images?.filter(Boolean).map((url: string) => ({ url })) ?? [],
              rePhrasedOptionImage: opt.rePhrasedOptionImage?.filter(Boolean).map((url: string) => ({ url })) ?? []
            })) : []
          }
        },
        correct: {
          identifiers: editingQuestionKind === 'MCQ'
            ? draftCorrectIdentifiers.slice(0, 1)
            : editingQuestionKind === 'MSQ'
              ? draftCorrectIdentifiers
              : [],
          fills: editingQuestionKind === 'FILLS' ? draftFills.map((s) => s.trim()).filter(Boolean) : [],
          ...(editingQuestionKind === 'INTEGER' && draftInteger.trim() ? { integer: Number(draftInteger.trim()) } : {})
        }
      };

      const updated = await updateQuestion(questionId, payload);

      const next = questions.map((q) => {
        if (String(q?._id) !== questionId) return q;
        return {
          ...q,
          ...(updated ?? {}),
          kind: (updated as any)?.kind ?? editingQuestionKind,
          prompt: (updated as any)?.prompt ?? payload.prompt,
          correct: (updated as any)?.correct ?? payload.correct
        };
      });

      questions = next;
      editingQuestionId = null;
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Could not save question changes.';
    }
  }

  function toggleCorrectOption(identifier: string) {
    const id = String(identifier ?? '').trim();
    if (!id) return;
    if (editingQuestionKind === 'MCQ') {
      draftCorrectIdentifiers =
        draftCorrectIdentifiers.length === 1 && draftCorrectIdentifiers[0] === id ? [] : [id];
      return;
    }
    if (editingQuestionKind === 'MSQ') {
      if (draftCorrectIdentifiers.includes(id)) {
        draftCorrectIdentifiers = draftCorrectIdentifiers.filter((x) => x !== id);
      } else {
        draftCorrectIdentifiers = [...draftCorrectIdentifiers, id];
      }
    }
  }

  async function toggleApprove(questionId: string, currentApprove: boolean) {
    try {
      await updateQuestionApproveStatus(questionId, !currentApprove);
      questions = questions.map((q) =>
        String(q._id) === questionId ? { ...q, approve: !currentApprove } : q
      );
    } catch {
      // silent
    }
  }

  function openReportModal(qid: string) {
    reportingQuestionId = qid;
    reportReason = 'WRONG_QUESTION';
    reportMessage = '';
    reportModalOpen = true;
    reportReasonDropdownOpen = false;
  }

  function closeReportModal() {
    reportModalOpen = false;
    reportReasonDropdownOpen = false;
  }

  function selectReportReason(reason: ReportReason) {
    reportReason = reason;
    reportReasonDropdownOpen = false;
  }

  async function handleReportSubmit() {
    if (!reportingQuestionId || !reportReason) return;
    isSubmittingReport = true;
    try {
      await createReport({
        questionId: reportingQuestionId,
        reason: reportReason,
        message: reportMessage
      });
      reportFeedback = { type: 'success', message: 'Report submitted successfully.' };
      closeReportModal();
    } catch (e: any) {
      reportFeedback = { type: 'error', message: e?.message || 'Failed to submit report.' };
    } finally {
      isSubmittingReport = false;
    }
  }

  $effect(() => {
    if (!browser || !reportReasonDropdownOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        reportReasonDropdownRef &&
        target instanceof Node &&
        !reportReasonDropdownRef.contains(target)
      ) {
        reportReasonDropdownOpen = false;
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        reportReasonDropdownOpen = false;
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  });

</script>

<svelte:head>
  <title>{examName || 'PYQ'} Paper Questions · Exam Abhyas</title>
</svelte:head>

<div class="pyq-papers-page min-h-full bg-[var(--pyq-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-6xl px-4 pt-3 pb-8">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <BackButton label="Back" tone="pyq" />
        <h1 class="text-xl font-bold text-[var(--pyq-accordion-title)]">
          {examName} Paper Questions
        </h1>
      </div>

      {#if paperDetails}
        <div class="flex items-center gap-2">
          {#if isReadOnly}
            <button
              type="button"
              class="h-9 min-w-[7.25rem] rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-4 text-sm font-medium text-[var(--pyq-sort-btn-text)] transition-all opacity-80 cursor-default"
            >
              View Test
            </button>
          {:else if (paperDetails.testAttemptedId ?? '').trim()}
            <button
              type="button"
              class="h-9 min-w-[7.25rem] rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-4 text-sm font-medium text-[var(--pyq-sort-btn-text)] transition-all hover:border-[var(--pyq-sort-btn-hover-border)] hover:bg-[var(--pyq-sort-btn-hover-bg)]"
              onclick={() => handleViewAnalysis(paperDetails)}
            >
              View Analysis
            </button>
            <button
              type="button"
              class="h-9 min-w-[7.25rem] rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-4 text-sm font-medium text-[var(--pyq-sort-btn-text)] transition-all hover:border-[var(--pyq-sort-btn-hover-border)] hover:bg-[var(--pyq-sort-btn-hover-bg)]"
              onclick={() => handleStartPaperTest(paperDetails, { testAttemptId: paperDetails.testAttemptedId })}
            >
              {startingPaperId === paperDetails._id ? 'Starting...' : 'Re-attempt'}
            </button>
          {:else if paperDetails.testId}
             <button
              type="button"
              class="h-9 min-w-[7.25rem] rounded-xl border border-[var(--pyq-sort-btn-border)] bg-[var(--pyq-sort-btn-bg)] px-4 text-sm font-medium text-[var(--pyq-sort-btn-text)] transition-all hover:border-[var(--pyq-sort-btn-hover-border)] hover:bg-[var(--pyq-sort-btn-hover-bg)]"
              onclick={() => handleStartPaperTest(paperDetails)}
            >
              {startingPaperId === paperDetails._id ? 'Starting...' : 'Start Test'}
            </button>
          {/if}
        </div>
      {/if}
    </div>

    {#if startingTestError}
      <div class="mb-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]">
        {startingTestError}
      </div>
    {/if}

    {#if isLoading}
      <div class="space-y-4">
        {#each Array(3) as _}
          <div class="animate-pulse rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] p-4">
            <div class="mb-4 h-5 w-3/4 rounded bg-[var(--pyq-paper-border)]/50"></div>
            <div class="mb-6 flex gap-2">
              <div class="h-6 w-16 rounded bg-[var(--pyq-paper-border)]/50"></div>
              <div class="h-6 w-32 rounded bg-[var(--pyq-paper-border)]/50"></div>
            </div>
            <div class="space-y-2">
              <div class="h-12 w-full rounded-lg bg-[var(--pyq-paper-border)]/30"></div>
              <div class="h-12 w-full rounded-lg bg-[var(--pyq-paper-border)]/30"></div>
              <div class="h-12 w-full rounded-lg bg-[var(--pyq-paper-border)]/30"></div>
              <div class="h-12 w-full rounded-lg bg-[var(--pyq-paper-border)]/30"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if error}
      <div class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]">
        {error}
      </div>
    {:else if questions.length === 0}
      <div class="rounded-2xl border border-[var(--pyq-accordion-border)] bg-[var(--pyq-accordion-bg)] px-4 py-3 text-sm text-[var(--pyq-accordion-title)]">
        No questions found for this paper.
      </div>
    {:else}
      {#if saveError}
        <div class="mb-3 rounded-lg border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-xs text-[var(--pc-error-text)]">
          {saveError}
        </div>
      {/if}
      {#if reportFeedback}
        <div class="mb-3 rounded-lg border px-3 py-2 text-xs {reportFeedback.type === 'success'
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] text-[var(--pc-error-text)]'}">
          {reportFeedback.message}
        </div>
      {/if}

      <!-- Subject tabs -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          {#if subjectTabs.length > 1}
            {#each subjectTabs as tab}
  <button
    type="button"
    disabled={isTabSwitching}
    aria-busy={isTabSwitching && activeTab === tab}
    onclick={() => selectTab(tab)}
    class="rounded-full px-4 py-1.5 text-sm font-semibold transition-all
      {activeTab === tab
        ? 'bg-[var(--page-link)] text-white shadow-md'
        : 'border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)]'}
      {isTabSwitching
        ? 'cursor-not-allowed opacity-60 pointer-events-none'
        : ''}"
  >
    {#if isTabSwitching && activeTab === tab}
      Loading...
    {:else}
      {tab.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
    {/if}
  </button>
{/each}
          {/if}
        </div>
        <div class="ml-auto flex items-center gap-4">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--pyq-paper-meta)]">
            <input
  type="checkbox"
  bind:checked={showOptions}
  disabled={isTabSwitching}
  class="h-4 w-4 rounded border-[var(--pyq-paper-border)] bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
/>
            <span>Options</span>
          </label>
        </div>
      </div>

      <div class="space-y-3">
        {#each activeQuestions as q, idx (q._id)}
          {@const prompt = questionPromptEnContent(q as any)}
          {@const options = q.prompt?.en?.options ?? []}
          {@const explanation = (q.prompt?.en?.explanation ?? '').trim()}
          {@const rePhrasedExplanation = (q.prompt?.en?.rePhrasedExplanation ?? '').trim()}
          {@const fills = q.correct?.fills ?? []}
          {@const integerValue = q.correct?.integer}
          {@const kind = String(q.kind ?? '').toUpperCase()}
          {@const isMcq = kind === 'MCQ' || (kind === '' && options.length > 0)}
          {@const isMsq = kind === 'MSQ'}
          {@const isInteger = kind === 'INTEGER' || (kind === '' && typeof integerValue === 'number')}
          {@const isFill = kind === 'FILLS' || (!isMcq && !isMsq && !isInteger && fills.length > 0)}
          {@const isEditing = editingQuestionId === q._id}
          <section class="rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] p-4">
            <div class="space-y-2">
              <h2 class="text-base font-semibold text-[var(--pyq-paper-title)]">
                Q{idx + 1}. {#if isEditing}Editing question{:else}<MathText content={prompt} />{/if}
              </h2>

              <!-- Keep meta/actions in a separate row so question text stays continuous -->
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-md border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-xs font-semibold text-[var(--pyq-paper-title)]">
                    {String(q.kind ?? 'NA').toUpperCase()}
                  </span>
                  <span class="max-w-[14rem] truncate rounded-md border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-sm font-semibold text-[var(--pyq-paper-meta)]" title={String(q.slug ?? '')}>
                    {q.slug ? `slug: ${q.slug}` : 'slug: NA'}
                  </span>

                  {#if !isEditing && q.chapterSlug}
                    <span class="rounded-md bg-black/20 px-2 py-1 text-sm font-semibold text-white">
                      Chapter: {String(q.chapterSlug)}
                    </span>
                  {/if}
                </div>

                {#if !isEditing}
                  <div class="flex items-center gap-2">
                    <!-- Approve status badge + toggle -->
                    {#if q.approve}
                      <span class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
                        ✓Appr
                      </span>
                    {:else}
                      <span class="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400">
                        ✗Unappr
                      </span>
                    {/if}

                    <button
                      type="button"
                      class="rounded-md border px-3 py-1 text-xs font-semibold transition
                        {q.approve
                          ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'border-emerald-500/40 bg-red-500/10 text-emerald-400 hover:bg-emerald-500/20'}"
                      onclick={() => toggleApprove(String(q._id), !!q.approve)}
                    >
                      {q.approve ? 'Unapprove' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      class="btn-cta-subscription-outline px-3 py-1 text-xs"
                      onclick={() => startEdit(q)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="rounded-md border px-3 py-1 text-xs font-semibold transition {openSolutionQuestionId === String(q._id)
                        ? 'border-[var(--page-link)] bg-[var(--page-link)]/15 text-[var(--page-link)]'
                        : 'border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)]'}"
                      onclick={() => toggleSolution(String(q._id))}
                    >
                      {openSolutionQuestionId === String(q._id) ? 'Hide' : 'Solution'}
                    </button>
                    <button
                      type="button"
                      class="rounded-md border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-1 text-xs font-semibold text-[var(--pc-error-text)] transition hover:opacity-90"
                      onclick={() => openReportModal(String(q._id))}
                    >
                      Report
                    </button>
                  </div>
                {/if}
              </div>
            </div>

            {#if isEditing}
              <div class="mt-3 space-y-3">
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Question
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" rows="3" bind:value={draftContent}></textarea>
                </label>
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Question Images (URLs)
                  <div class="mt-1 flex flex-col gap-2">
                    {#each draftImages as img, idx}
                      <div class="flex gap-2 items-center">
                        <input class="flex-1 rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-sm text-[var(--pyq-paper-title)]" 
                          value={img} 
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            const arr = [...draftImages];
                            arr[idx] = val;
                            draftImages = arr;
                          }}
                          placeholder="Image URL"
                        />
                        <label class="btn-cta-subscription-outline flex cursor-pointer items-center justify-center px-3 py-1 text-xs {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                          <span>Browse</span>
                          <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                            const arr = [...draftImages];
                            arr[idx] = url;
                            draftImages = arr;
                          })} />
                        </label>
                        {#if draftImages.length > 1}
                          <button type="button" class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftImages = draftImages.filter((_, i) => i !== idx)} title="Remove URL">✕</button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" class="btn-cta-subscription-outline self-end px-3 py-1 text-xs" onclick={() => draftImages = [...draftImages, '']}>
                      +
                    </button>
                  </div>
                  {#if draftImages.filter(Boolean).length > 0}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each draftImages.filter(Boolean) as img, idx}
                        <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                          <img src={img} alt="preview" class="max-h-20 max-w-[150px] object-contain rounded" />
                          <button type="button" class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftImages = draftImages.filter((val) => val !== img)} title="Remove image">✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </label>
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Re-phrased Question Image (URLs)
                  <div class="mt-1 flex flex-col gap-2">
                    {#each draftRePhrasedQuestionImages as img, idx}
                      <div class="flex gap-2 items-center">
                        <input class="flex-1 rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-sm text-[var(--pyq-paper-title)]" 
                          value={img} 
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            const arr = [...draftRePhrasedQuestionImages];
                            arr[idx] = val;
                            draftRePhrasedQuestionImages = arr;
                          }}
                          placeholder="Image URL"
                        />
                        <label class="btn-cta-subscription-outline flex cursor-pointer items-center justify-center px-3 py-1 text-xs {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                          <span>Browse</span>
                          <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                            const arr = [...draftRePhrasedQuestionImages];
                            arr[idx] = url;
                            draftRePhrasedQuestionImages = arr;
                          })} />
                        </label>
                        {#if draftRePhrasedQuestionImages.length > 1}
                          <button type="button" class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftRePhrasedQuestionImages = draftRePhrasedQuestionImages.filter((_, i) => i !== idx)} title="Remove URL">✕</button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" class="btn-cta-subscription-outline self-end px-3 py-1 text-xs" onclick={() => draftRePhrasedQuestionImages = [...draftRePhrasedQuestionImages, '']}>
                      +
                    </button>
                  </div>
                  {#if draftRePhrasedQuestionImages.filter(Boolean).length > 0}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each draftRePhrasedQuestionImages.filter(Boolean) as img, idx}
                        <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                          <img src={img} alt="preview" class="max-h-20 max-w-[150px] object-contain rounded" />
                          <button type="button" class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftRePhrasedQuestionImages = draftRePhrasedQuestionImages.filter((val) => val !== img)} title="Remove image">✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </label>

                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Explanation
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-lg text-[var(--pyq-paper-title)]" rows="3" bind:value={draftExplanation}></textarea>
                </label>
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Explanation Images (URLs)
                  <div class="mt-1 flex flex-col gap-2">
                    {#each draftExplanationImages as img, idx}
                      <div class="flex gap-2 items-center">
                        <input class="flex-1 rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-sm text-[var(--pyq-paper-title)]" 
                          value={img} 
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            const arr = [...draftExplanationImages];
                            arr[idx] = val;
                            draftExplanationImages = arr;
                          }}
                          placeholder="Image URL"
                        />
                        <label class="btn-cta-subscription-outline flex cursor-pointer items-center justify-center px-3 py-1 text-xs {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                          <span>Browse</span>
                          <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                            const arr = [...draftExplanationImages];
                            arr[idx] = url;
                            draftExplanationImages = arr;
                          })} />
                        </label>
                        {#if draftExplanationImages.length > 1}
                          <button type="button" class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftExplanationImages = draftExplanationImages.filter((_, i) => i !== idx)} title="Remove URL">✕</button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" class="btn-cta-subscription-outline self-end px-3 py-1 text-xs" onclick={() => draftExplanationImages = [...draftExplanationImages, '']}>
                      +
                    </button>
                  </div>
                  {#if draftExplanationImages.filter(Boolean).length > 0}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each draftExplanationImages.filter(Boolean) as img, idx}
                        <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                          <img src={img} alt="preview" class="max-h-20 max-w-[150px] object-contain rounded" />
                          <button type="button" class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftExplanationImages = draftExplanationImages.filter((val) => val !== img)} title="Remove image">✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </label>

                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Re-phrased Explanation
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" rows="3" bind:value={draftRePhrasedExplanation}></textarea>
                </label>
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Re-phrased Explanation Images (URLs)
                  <div class="mt-1 flex flex-col gap-2">
                    {#each draftRePhrasedExplanationImages as img, idx}
                      <div class="flex gap-2 items-center">
                        <input class="flex-1 rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-sm text-[var(--pyq-paper-title)]" 
                          value={img} 
                          oninput={(e) => {
                            const val = (e.currentTarget as HTMLInputElement).value;
                            const arr = [...draftRePhrasedExplanationImages];
                            arr[idx] = val;
                            draftRePhrasedExplanationImages = arr;
                          }}
                          placeholder="Image URL"
                        />
                        <label class="btn-cta-subscription-outline flex cursor-pointer items-center justify-center px-3 py-1 text-xs {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                          <span>Browse</span>
                          <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                            const arr = [...draftRePhrasedExplanationImages];
                            arr[idx] = url;
                            draftRePhrasedExplanationImages = arr;
                          })} />
                        </label>
                        {#if draftRePhrasedExplanationImages.length > 1}
                          <button type="button" class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftRePhrasedExplanationImages = draftRePhrasedExplanationImages.filter((_, i) => i !== idx)} title="Remove URL">✕</button>
                        {/if}
                      </div>
                    {/each}
                    <button type="button" class="btn-cta-subscription-outline self-end px-3 py-1 text-xs" onclick={() => draftRePhrasedExplanationImages = [...draftRePhrasedExplanationImages, '']}>
                      +
                    </button>
                  </div>
                  {#if draftRePhrasedExplanationImages.filter(Boolean).length > 0}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each draftRePhrasedExplanationImages.filter(Boolean) as img, idx}
                        <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                          <img src={img} alt="preview" class="max-h-20 max-w-[150px] object-contain rounded" />
                          <button type="button" class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftRePhrasedExplanationImages = draftRePhrasedExplanationImages.filter((val) => val !== img)} title="Remove image">✕</button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </label>

                {#if editingQuestionKind === 'MCQ' || editingQuestionKind === 'MSQ'}
                  <div class="space-y-2">
                    {#each draftOptions as opt, optIndex (opt.identifier + optIndex)}
                      {@const selected = draftCorrectIdentifiers.includes(opt.identifier)}
                      <div class="flex flex-col gap-2 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-2">
                        <div class="flex items-center gap-2">
                          <input
                            class="w-14 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-sm text-[var(--pyq-paper-title)]"
                            bind:value={draftOptions[optIndex].identifier}
                            placeholder="A"
                          />
                          <input
                            class="flex-1 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-base text-[var(--pyq-paper-title)]"
                            bind:value={draftOptions[optIndex].content}
                            placeholder="Option text"
                          />
                          <button
                            type="button"
                            class="rounded px-2 py-1 text-xs border {selected ? 'border-emerald-500 text-emerald-600' : 'border-[var(--pyq-paper-border)]'}"
                            onclick={() => toggleCorrectOption(opt.identifier)}
                          >
                            {selected ? 'Correct' : 'Mark correct'}
                          </button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div class="mt-2">
                            <label class="block text-[10px] font-semibold text-[var(--pyq-paper-meta)]">
                              Option Images
                            </label>
                            <div class="mt-1 flex flex-col gap-1">
                              {#each (opt.images || ['']) as img, imgIdx}
                                <div class="flex gap-1 items-center">
                                  <input class="flex-1 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-xs text-[var(--pyq-paper-title)]" 
                                    value={img} 
                                    oninput={(e) => {
                                      const val = (e.currentTarget as HTMLInputElement).value;
                                      const arr = [...(opt.images || [''])];
                                      arr[imgIdx] = val;
                                      draftOptions[optIndex].images = arr;
                                    }}
                                    placeholder="Image URL"
                                  />
                                  <label class="cursor-pointer rounded border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)] transition {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                                    <span>Browse</span>
                                    <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                                      const arr = [...(opt.images || [])];
                                      arr[imgIdx] = url;
                                      draftOptions[optIndex].images = arr;
                                    })} />
                                  </label>
                                  {#if (opt.images || []).length > 1}
                                    <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftOptions[optIndex].images = (opt.images || []).filter((_: any, i: number) => i !== imgIdx)} title="Remove URL">✕</button>
                                  {/if}
                                </div>
                              {/each}
                              <button type="button" class="rounded border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] self-end w-fit px-2 py-1 text-[10px] font-semibold text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)]" onclick={() => draftOptions[optIndex].images = [...(opt.images || []), '']}>
                                +
                              </button>
                            </div>
                            {#if (opt.images || []).filter((i: any) => i).length > 0}
                              <div class="mt-1 flex flex-wrap gap-1">
                                {#each (opt.images || []).filter((i: any) => i) as img, imgIdx}
                                  <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                                    <img src={img} alt="preview" class="max-h-12 max-w-[100px] object-contain rounded" />
                                    <button type="button" class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftOptions[optIndex].images = (opt.images || []).filter((val: any) => val !== img)} title="Remove image">✕</button>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                          </div>

                          <div class="mt-2">
                            <label class="block text-[10px] font-semibold text-[var(--pyq-paper-meta)]">
                              Re-phrased Option Images
                            </label>
                            <div class="mt-1 flex flex-col gap-1">
                              {#each (opt.rePhrasedOptionImage || ['']) as img, imgIdx}
                                <div class="flex gap-1 items-center">
                                  <input class="flex-1 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-xs text-[var(--pyq-paper-title)]" 
                                    value={img} 
                                    oninput={(e) => {
                                      const val = (e.currentTarget as HTMLInputElement).value;
                                      const arr = [...(opt.rePhrasedOptionImage || [''])];
                                      arr[imgIdx] = val;
                                      draftOptions[optIndex].rePhrasedOptionImage = arr;
                                    }}
                                    placeholder="Image URL"
                                  />
                                  <label class="cursor-pointer rounded border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)] transition {isUploadingImage ? 'opacity-50 pointer-events-none' : ''}">
                                    <span>Browse</span>
                                    <input type="file" accept="image/*" class="hidden" onchange={(e) => handleImageUpload(e, (url) => {
                                      const arr = [...(opt.rePhrasedOptionImage || [])];
                                      arr[imgIdx] = url;
                                      draftOptions[optIndex].rePhrasedOptionImage = arr;
                                    })} />
                                  </label>
                                  {#if (opt.rePhrasedOptionImage || []).length > 1}
                                    <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pc-error-bg)] text-[var(--pc-error-text)] border border-[var(--pc-error-border)]" onclick={() => draftOptions[optIndex].rePhrasedOptionImage = (opt.rePhrasedOptionImage || []).filter((_: any, i: number) => i !== imgIdx)} title="Remove URL">✕</button>
                                  {/if}
                                </div>
                              {/each}
                              <button type="button" class="rounded border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] self-end w-fit px-2 py-1 text-[10px] font-semibold text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)]" onclick={() => draftOptions[optIndex].rePhrasedOptionImage = [...(opt.rePhrasedOptionImage || []), '']}>
                                +
                              </button>
                            </div>
                            {#if (opt.rePhrasedOptionImage || []).filter((i: any) => i).length > 0}
                              <div class="mt-1 flex flex-wrap gap-1">
                                {#each (opt.rePhrasedOptionImage || []).filter((i: any) => i) as img, imgIdx}
                                  <div class="relative group rounded border border-[var(--pyq-paper-border)] bg-black/20 p-1">
                                    <img src={img} alt="preview" class="max-h-12 max-w-[100px] object-contain rounded" />
                                    <button type="button" class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100" onclick={() => draftOptions[optIndex].rePhrasedOptionImage = (opt.rePhrasedOptionImage || []).filter((val: any) => val !== img)} title="Remove image">✕</button>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                  <p class="text-[11px] text-[var(--pyq-paper-meta)]">
                    {editingQuestionKind === 'MCQ' ? 'MCQ allows only one correct option.' : 'MSQ allows multiple correct options.'}
                  </p>
                {:else if editingQuestionKind === 'INTEGER'}
                  <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                    Integer answer
                    <input type="number" class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" bind:value={draftInteger} />
                  </label>
                {:else}
                  <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                    Fills (comma separated)
                    <input
                      class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]"
                      value={draftFills.join(', ')}
                      oninput={(e) => {
                        draftFills = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim());
                      }}
                    />
                  </label>
                {/if}

                <div class="flex items-center justify-end gap-2">
                  <button type="button" class="btn-cta-subscription-outline px-3 py-1 text-xs" onclick={cancelEdit}>Cancel</button>
                  <button type="button" class=" h-9 min-w-[6.5rem] shrink-0 rounded-xl border border-[var(--page-link)] bg-[color-mix(in_srgb,var(--page-link)_18%,var(--sh-exam-card-arrow-bg))] px-4 text-sm font-medium text-[var(--page-link)] transition-all duration-150 hover:border-[var(--page-link)] hover:bg-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-arrow-bg))] disabled:cursor-not-allowed disabled:opacity-50" onclick={() => saveEdit(q._id)}>Save</button>
                </div>
              </div>
            {:else}
              <!-- Prompt images -->
              {#if q.prompt?.en?.images?.length}
                <div class="mt-3 grid grid-cols-2 gap-2">
                  {#each q.prompt.en.images as img}
                    {#if img?.url}
                      <img src={img.url} alt={img.alt ?? ''} class="max-h-48 w-full rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                    {/if}
                  {/each}
                </div>
              {/if}

              {#if q.prompt?.en?.rePhrasedQuestionImage?.length}
                <div class="mt-2">
                  <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--pyq-paper-meta)]">Rephrased image</div>
                  <div class="grid grid-cols-2 gap-2">
                    {#each q.prompt.en.rePhrasedQuestionImage as img}
                      {#if img?.url}
                        <img src={img.url} alt={img.alt ?? ''} class="max-h-48 w-full rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}


              {#if showOptions && (isMcq || isMsq)}
                <ul class="mt-3 space-y-2 text-base text-[var(--pyq-paper-title)]">
                  {#each options as opt}
                    {@const isCorrectOption = (q.correct?.identifiers ?? []).includes(opt.identifier)}
                    <li
                      class="flex items-start gap-2 rounded-lg border px-3 py-2 {isCorrectOption
                        ? 'border-emerald-500/70 bg-emerald-500/15'
                        : 'border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)]'}"
                    >
                      <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pyq-paper-border)] text-[11px] font-semibold">
                        {opt.identifier}
                      </span>
                      <div class="min-w-0 flex-1 break-words text-[1.02rem] leading-[1.7] text-[var(--pyq-paper-title)]">
                        <MathText content={opt.content ?? ''} />
                        {#if opt.images?.length}
                          <div class="mt-2 flex flex-wrap gap-2">
                            {#each opt.images as img}
                              {#if img?.url}
                                <img src={img.url} alt={img.alt ?? ''} class="max-h-32 rounded border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                              {/if}
                            {/each}
                          </div>
                        {/if}

                        {#if opt.rePhrasedOptionImage?.length}
                          <div class="mt-2">
                            <div class="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--pyq-paper-meta)]">Rephrased image</div>
                            <div class="flex flex-wrap gap-2">
                              {#each opt.rePhrasedOptionImage as img}
                                {#if img?.url}
                                  <img src={img.url} alt={img.alt ?? ''} class="max-h-32 rounded border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                                {/if}
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>
                      {#if isCorrectOption}
                        <span class="ml-auto text-[11px] font-semibold text-emerald-300">Correct</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {:else if showOptions && isInteger}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-sm text-[var(--pyq-paper-meta)]">
                  <span class="font-semibold">Integer:</span> {integerValue}
                </div>
              {:else if showOptions && isFill}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-sm text-[var(--pyq-paper-meta)]">
                  <span class="font-semibold">Fills:</span> {fills.join(', ')}
                </div>
              {/if}

              {#if openSolutionQuestionId === String(q._id) && (explanation || q.prompt?.en?.explanationImages?.length || rePhrasedExplanation || q.prompt?.en?.rePhrasedImage?.length)}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-[1.05rem] leading-relaxed text-[var(--pyq-paper-title)]">
                  {#if explanation}
                    <span class="font-semibold text-sm">Explanation:</span>
                    <div class="mt-1"><MathText content={explanation} disableCache={true} /></div>
                  {/if}
                  
                  {#if q.prompt?.en?.explanationImages?.length}
                    {#if !explanation}<span class="font-semibold text-sm">Explanation:</span>{/if}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each q.prompt.en.explanationImages as img}
                        {#if img?.url}
                          <img src={img.url} alt={img.alt ?? ''} class="max-h-48 rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}

                  {#if rePhrasedExplanation || q.prompt?.en?.rePhrasedImage?.length}
                    <div class="mt-3 border-t border-[var(--pyq-paper-border)]/60 pt-3">
                      <span class="font-semibold text-sm">Re-phrased explanation:</span>
                      {#if rePhrasedExplanation}
                        <div class="mt-1"><MathText content={rePhrasedExplanation} disableCache={true} /></div>
                      {/if}

                      {#if q.prompt?.en?.rePhrasedImage?.length}
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each q.prompt.en.rePhrasedImage as img}
                            {#if img?.url}
                              <img src={img.url} alt={img.alt ?? ''} class="max-h-48 rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if reportModalOpen}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-md"
      role="button"
      tabindex="0"
      onclick={closeReportModal}
      onkeydown={(e) => e.key === 'Escape' ? closeReportModal() : null}
    ></div>
    <div class="relative w-full max-w-md rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-bg)] shadow-2xl">
      <div class="border-b border-[var(--page-card-border)] bg-[var(--page-card-bg)]/50 px-6 py-4">
        <h3 class="text-lg font-bold text-[var(--page-text)]">Report Question</h3>
      </div>

      <div class="space-y-4 p-6">
        <div>
          <label class="mb-2 block text-sm font-semibold text-[var(--page-text)]" for="reportReason">
            Reason for reporting
          </label>
          <div class="relative" bind:this={reportReasonDropdownRef}>
            <button
              type="button"
              id="reportReason"
              class="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-3 text-left text-sm text-[var(--page-text)] transition hover:border-[var(--page-link)]"
              aria-haspopup="listbox"
              aria-expanded={reportReasonDropdownOpen}
              onclick={() => (reportReasonDropdownOpen = !reportReasonDropdownOpen)}
            >
              <span class="truncate">
                {reportReasonOptions.find((option) => option.value === reportReason)?.label ?? 'Select reason'}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="shrink-0 text-[var(--page-text-muted)] transition-transform {reportReasonDropdownOpen ? 'rotate-180' : ''}"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </button>
            {#if reportReasonDropdownOpen}
              <div class="absolute left-0 right-0 z-10 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] shadow-xl">
                <ul role="listbox" aria-labelledby="reportReason" class="py-1">
                  {#each reportReasonOptions as option (option.value)}
                    <li>
                      <button
                        type="button"
                        role="option"
                        aria-selected={reportReason === option.value}
                        class="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition {reportReason === option.value ? 'bg-[var(--page-link)]/12 text-[var(--page-link)]' : 'text-[var(--page-text)] hover:bg-[var(--page-card-bg)]/70'}"
                        onclick={() => selectReportReason(option.value)}
                      >
                        <span class="truncate">{option.label}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm font-semibold text-[var(--page-text)]" for="reportMessage">
            Description (optional)
          </label>
          <textarea
            id="reportMessage"
            bind:value={reportMessage}
            placeholder="Provide more details about the issue..."
            rows="4"
            class="w-full resize-none rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] p-4 text-sm text-[var(--page-text)]"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-[var(--page-card-border)] bg-[var(--page-card-bg)]/30 px-6 py-4">
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold text-[var(--page-text-muted)] transition hover:text-[var(--page-text)]"
          onclick={closeReportModal}
          disabled={isSubmittingReport}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-semantic-error px-6 py-2 text-sm font-bold text-white transition hover:bg-semantic-error/90 disabled:opacity-50"
          onclick={handleReportSubmit}
          disabled={isSubmittingReport}
        >
          {#if isSubmittingReport}
            Submitting...
          {:else}
            Submit Report
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}