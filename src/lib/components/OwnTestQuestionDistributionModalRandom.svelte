<script lang="ts">
  import type {
    OwnTestDistributionContinueData,
    OwnTestSelectionSnapshot,
    OwnTestSubjectQuestionDistribution
  } from '$lib/ownTest/questionDistribution';
  import {
    buildDistributionBySubject,
    clampQuestions,
    distributeQuestionsWeighted,
    sumQuestions,
    type OwnTestChapterQuestionDistribution
  } from '$lib/ownTest/questionDistribution';

  type ContinuePayload = {
    snapshot: OwnTestSelectionSnapshot;
    totalsBySubjectId: Record<string, number>;
    distributionBySubjectId: Record<string, OwnTestSubjectQuestionDistribution>;
    data: OwnTestDistributionContinueData;
  };

  type Props = {
    open: boolean;
    snapshot: OwnTestSelectionSnapshot | null;
    onClose: () => void;
    onContinue?: (payload: ContinuePayload) => void | Promise<void>;
    submitting?: boolean;
    errorMessage?: string | null;
  };

  let { open, snapshot, onClose, onContinue, submitting = false, errorMessage = null }: Props = $props();

  let totalsInput = $state<Record<string, string>>({});
  let chapterInputs = $state<Record<string, Record<string, string>>>({});
  let topicInputs = $state<Record<string, Record<string, Record<string, string>>>>({});
  let openTopicRows = $state<Set<string>>(new Set());
  let prevOpen = $state(false);
  let pendingRedistribution = $state(0);
  let pendingTarget = $state<{ type: 'subject' | 'chapter'; subjectId: string; chapterId?: string } | null>(null);
  const MAX_TEST_QUESTIONS = 100;
  let maxQuestionsFlashMessage = $state<string | null>(null);
  let maxQuestionsFlashSeq = $state(0);

  $effect(() => {
    const becameOpen = open && !prevOpen;
    prevOpen = open;
    if (!becameOpen || !snapshot) return;

    const nextTotals: Record<string, string> = {};
    const nextChapters: Record<string, Record<string, string>> = {};
    const nextTopics: Record<string, Record<string, Record<string, string>>> = {};

    for (const subject of snapshot.subjects) {
      nextTotals[subject.subjectId] = '';
      nextChapters[subject.subjectId] = {};
      nextTopics[subject.subjectId] = {};
      for (const chapter of subject.chapters ?? []) {
        nextChapters[subject.subjectId][chapter.chapterId] = '';
        nextTopics[subject.subjectId][chapter.chapterId] = {};
        for (const topic of chapter.topics) {
          nextTopics[subject.subjectId][chapter.chapterId][topic.topicId] = '';
        }
      }
    }

    totalsInput = nextTotals;
    chapterInputs = nextChapters;
    topicInputs = nextTopics;
    openTopicRows = new Set();
  });

  function findSubject(subjectId: string) {
    return snapshot?.subjects.find((x) => x.subjectId === subjectId) ?? null;
  }

  function findChapter(subjectId: string, chapterId: string) {
    return findSubject(subjectId)?.chapters?.find((x) => x.chapterId === chapterId) ?? null;
  }

  function clampSubjectLocal(subjectId: string, raw: string): number {
    const subject = findSubject(subjectId);
    return clampQuestions(parseInt(raw.trim(), 10), subject?.maxQuestions ?? 0);
  }

  function getOtherSubjectsTotal(subjectId: string): number {
    if (!snapshot) return 0;
    let sum = 0;
    for (const subject of snapshot.subjects) {
      if (subject.subjectId === subjectId) continue;
      sum += clampSubjectLocal(subject.subjectId, totalsInput[subject.subjectId] ?? '0');
    }
    return sum;
  }

  function clampSubjectRaw(subjectId: string, raw: string): number {
    const subjectCap = findSubject(subjectId)?.maxQuestions ?? 0;
    const globalRemaining = Math.max(0, MAX_TEST_QUESTIONS - getOtherSubjectsTotal(subjectId));
    return clampQuestions(parseInt(raw.trim(), 10), Math.min(subjectCap, globalRemaining));
  }

  function clampChapterRaw(subjectId: string, chapterId: string, raw: string): number {
    const chapter = findChapter(subjectId, chapterId);
    return clampQuestions(parseInt(raw.trim(), 10), chapter?.maxQuestions ?? 0);
  }

  function clampTopicRaw(subjectId: string, chapterId: string, topicId: string, raw: string): number {
    const chapter = findChapter(subjectId, chapterId);
    const topic = chapter?.topics.find((t) => t.topicId === topicId);
    return clampQuestions(parseInt(raw.trim(), 10), topic?.maxQuestions ?? 0);
  }

  function getTopicSum(subjectId: string, chapterId: string): number {
    const chapter = findChapter(subjectId, chapterId);
    if (!chapter) return 0;
    const topics = topicInputs[subjectId]?.[chapterId] ?? {};
    return chapter.topics.reduce((sum, topic) => sum + clampTopicRaw(subjectId, chapterId, topic.topicId, topics[topic.topicId] ?? '0'), 0);
  }

  function getChapterSum(subjectId: string): number {
    const subject = findSubject(subjectId);
    if (!subject) return 0;
    const chapters = chapterInputs[subjectId] ?? {};
    return (subject.chapters ?? []).reduce((sum, chapter) => sum + clampChapterRaw(subjectId, chapter.chapterId, chapters[chapter.chapterId] ?? '0'), 0);
  }

  function syncChapterTopics(subjectId: string, chapterId: string, chapterTotal: number) {
    const chapter = findChapter(subjectId, chapterId);
    if (!chapter) return;
    const dist = distributeQuestionsWeighted(chapterTotal, chapter.topics.map((topic) => topic.maxQuestions));
    const next = { ...(topicInputs[subjectId]?.[chapterId] ?? {}) };
    chapter.topics.forEach((topic, i) => {
      next[topic.topicId] = String(dist[i] ?? 0);
    });
    topicInputs = {
      ...topicInputs,
      [subjectId]: {
        ...(topicInputs[subjectId] ?? {}),
        [chapterId]: next
      }
    };
  }

  function setSubject(subjectId: string, value: string) {
    const parsed = parseInt(value.trim(), 10);
    const subjectCap = findSubject(subjectId)?.maxQuestions ?? 0;
    const globalRemaining = Math.max(0, MAX_TEST_QUESTIONS - getOtherSubjectsTotal(subjectId));
    const allowed = Math.min(subjectCap, globalRemaining);
    if (Number.isFinite(parsed) && parsed > allowed) {
      maxQuestionsFlashMessage = 'max 100 questions allow in a single test.';
      maxQuestionsFlashSeq += 1;
      const seq = maxQuestionsFlashSeq;
      setTimeout(() => {
        if (maxQuestionsFlashSeq === seq) maxQuestionsFlashMessage = null;
      }, 1000);
    }

    totalsInput = { ...totalsInput, [subjectId]: value };
    if (!value.trim()) {
      pendingTarget = null;
      pendingRedistribution += 1;
      return;
    }
    pendingTarget = { type: 'subject', subjectId };
    pendingRedistribution += 1;
  }

  function setChapter(subjectId: string, chapterId: string, value: string) {
    chapterInputs = {
      ...chapterInputs,
      [subjectId]: {
        ...(chapterInputs[subjectId] ?? {}),
        [chapterId]: value
      }
    };
    if (!value.trim()) {
      pendingTarget = null;
      pendingRedistribution += 1;
      return;
    }
    pendingTarget = { type: 'chapter', subjectId, chapterId };
    pendingRedistribution += 1;
  }

  function setTopic(subjectId: string, chapterId: string, topicId: string, value: string) {
    topicInputs = {
      ...topicInputs,
      [subjectId]: {
        ...(topicInputs[subjectId] ?? {}),
        [chapterId]: {
          ...(topicInputs[subjectId]?.[chapterId] ?? {}),
          [topicId]: value
        }
      }
    };
  }

  $effect(() => {
    if (!snapshot || !pendingTarget || pendingRedistribution <= 0) return;

    const target = pendingTarget;
    const ticket = pendingRedistribution;
    const timer = setTimeout(() => {
      if (pendingRedistribution !== ticket) return;

      if (target.type === 'subject') {
        const subject = findSubject(target.subjectId);
        if (!subject) return;
        const total = clampSubjectRaw(target.subjectId, totalsInput[target.subjectId] ?? '0');
        totalsInput = { ...totalsInput, [target.subjectId]: String(total) };
        const chapterDist = distributeQuestionsWeighted(
          total,
          (subject.chapters ?? []).map((ch) => ch.maxQuestions)
        );
        const nextChapters: Record<string, string> = {};
        for (const [i, chapter] of (subject.chapters ?? []).entries()) {
          const chapterTotal = chapterDist[i] ?? 0;
          nextChapters[chapter.chapterId] = String(chapterTotal);
          syncChapterTopics(target.subjectId, chapter.chapterId, chapterTotal);
        }
        chapterInputs = { ...chapterInputs, [target.subjectId]: nextChapters };
      } else if (target.type === 'chapter' && target.chapterId) {
        const chapterTotal = clampChapterRaw(
          target.subjectId,
          target.chapterId,
          chapterInputs[target.subjectId]?.[target.chapterId] ?? '0'
        );
        chapterInputs = {
          ...chapterInputs,
          [target.subjectId]: {
            ...(chapterInputs[target.subjectId] ?? {}),
            [target.chapterId]: String(chapterTotal)
          }
        };
        syncChapterTopics(target.subjectId, target.chapterId, chapterTotal);
      }
    }, 180);

    return () => clearTimeout(timer);
  });

  function chapterIsValid(subjectId: string, chapterId: string): boolean {
    const chapterTotal = clampChapterRaw(subjectId, chapterId, chapterInputs[subjectId]?.[chapterId] ?? '0');
    return getTopicSum(subjectId, chapterId) === chapterTotal;
  }

  function subjectIsValid(subjectId: string): boolean {
    const subject = findSubject(subjectId);
    if (!subject) return false;
    const subjectTotal = clampSubjectRaw(subjectId, totalsInput[subjectId] ?? '0');
    const chapterTotal = getChapterSum(subjectId);
    if (subjectTotal !== chapterTotal) return false;
    return (subject.chapters ?? []).every((chapter) => chapterIsValid(subjectId, chapter.chapterId));
  }

  const hasInvalidSubjects = $derived.by(() => {
    if (!snapshot) return true;
    const totalAcrossSubjects = snapshot.subjects.reduce(
      (sum, subject) => sum + clampSubjectRaw(subject.subjectId, totalsInput[subject.subjectId] ?? '0'),
      0
    );
    if (totalAcrossSubjects > MAX_TEST_QUESTIONS) return true;
    return snapshot.subjects.some((subject) => !subjectIsValid(subject.subjectId));
  });

  const rawSubjectTotal = $derived.by(() => {
    if (!snapshot) return 0;
    return snapshot.subjects.reduce((sum, subject) => {
      const raw = parseInt((totalsInput[subject.subjectId] ?? '').trim(), 10);
      return sum + (Number.isFinite(raw) && raw > 0 ? raw : 0);
    }, 0);
  });

  const maxQuestionsError = $derived(rawSubjectTotal > MAX_TEST_QUESTIONS ? 'max 100 questions allow in a single test.' : null);
  const effectiveMaxQuestionsMessage = $derived(maxQuestionsError ?? maxQuestionsFlashMessage);

  function toggleTopics(subjectId: string, chapterId: string) {
    const key = `${subjectId}::${chapterId}`;
    const next = new Set(openTopicRows);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    openTopicRows = next;
  }

  function handleBackdrop(e: MouseEvent) {
    if (submitting) return;
    if (e.target === e.currentTarget) onClose();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open && !submitting) onClose();
  }

  function buildChapterDistribution(subjectId: string, chapterId: string): OwnTestChapterQuestionDistribution | null {
    const chapter = findChapter(subjectId, chapterId);
    if (!chapter) return null;
    const chapterTotal = clampChapterRaw(subjectId, chapterId, chapterInputs[subjectId]?.[chapterId] ?? '0');
    return {
      chapterId: chapter.chapterId,
      chapterName: chapter.chapterName,
      maxQuestions: chapter.maxQuestions,
      questionCount: chapterTotal,
      topics: chapter.topics.map((topic) => ({
        topicId: topic.topicId,
        topicName: topic.topicName,
        maxQuestions: topic.maxQuestions,
        questionCount: clampTopicRaw(subjectId, chapterId, topic.topicId, topicInputs[subjectId]?.[chapterId]?.[topic.topicId] ?? '0')
      }))
    };
  }

  async function handleContinue() {
    if (!snapshot || hasInvalidSubjects || submitting || Boolean(maxQuestionsError)) return;
    const totalsBySubjectId: Record<string, number> = {};
    const distributionBySubjectId = buildDistributionBySubject(snapshot, {});

    for (const subject of snapshot.subjects) {
      const subjectTotal = clampSubjectRaw(subject.subjectId, totalsInput[subject.subjectId] ?? '0');
      const chapters = (subject.chapters ?? [])
        .map((chapter) => buildChapterDistribution(subject.subjectId, chapter.chapterId))
        .filter((x): x is OwnTestChapterQuestionDistribution => Boolean(x));
      if (sumQuestions(chapters) !== subjectTotal) return;
      if (chapters.some((chapter) => sumQuestions(chapter.topics) !== chapter.questionCount)) return;

      totalsBySubjectId[subject.subjectId] = subjectTotal;
      distributionBySubjectId[subject.subjectId] = {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        maxQuestions: subject.maxQuestions,
        totalQuestions: subjectTotal,
        chapters
      };
    }

    const data: OwnTestDistributionContinueData = {
      subjects: snapshot.subjects.map((subject) => ({
        id: subject.subjectId,
        chapterGroup: (subject.chapters ?? []).map((chapter) => ({
          id: chapter.chapterId,
          chapters: [chapter.chapterId],
          numberOfQuestions: clampChapterRaw(subject.subjectId, chapter.chapterId, chapterInputs[subject.subjectId]?.[chapter.chapterId] ?? '0'),
          topics: chapter.topics.map((topic) => ({
            id: topic.topicId,
            numberOfQuestions: clampTopicRaw(subject.subjectId, chapter.chapterId, topic.topicId, topicInputs[subject.subjectId]?.[chapter.chapterId]?.[topic.topicId] ?? '0')
          }))
        }))
      }))
    };

    if (onContinue) {
      await Promise.resolve(onContinue({ snapshot, totalsBySubjectId, distributionBySubjectId, data }));
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open && snapshot}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="own-q-modal-backdrop" onclick={handleBackdrop} role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="own-q-modal-title">
    <div class="own-q-modal-sheet own-q-modal-sheet--wide">
      <div class="own-q-modal-header">
        <h2 id="own-q-modal-title" class="own-q-modal-title">Question distribution</h2>
        <p class="own-q-modal-sub">
          Set question counts for subject, chapter, and topic. Continue is enabled only when all chapter sums match the subject total and all topic sums match the chapter total.
        </p>
        <button type="button" class="own-q-modal-close" onclick={onClose} disabled={submitting} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="own-q-modal-body">
        {#each snapshot.subjects as sub (sub.subjectId)}
          {@const subjectTotal = clampSubjectRaw(sub.subjectId, totalsInput[sub.subjectId] ?? '0')}
          {@const chapterSum = getChapterSum(sub.subjectId)}
          {@const subjectOk = subjectIsValid(sub.subjectId)}
          <section class="own-q-modal-card" data-own-accent={sub.accent}>
            <div class="own-q-modal-card__head">
              <h3 class="own-q-modal-card__title">{sub.subjectName}</h3>
              <span class="own-q-modal-card__cap">Up to {sub.maxQuestions} questions</span>
            </div>

            <label class="own-q-modal-field">
              <span class="own-q-modal-field__label">Subject total</span>
              <input
                type="number"
                min="0"
                max={sub.maxQuestions}
                class="own-q-modal-input"
                placeholder="Enter count"
                value={totalsInput[sub.subjectId] ?? ''}
                oninput={(e) => setSubject(sub.subjectId, (e.currentTarget as HTMLInputElement).value)}
              />
            </label>

            <ul class="own-q-modal-units" role="list">
              {#each sub.chapters ?? [] as chapter (chapter.chapterId)}
                {@const chapterInput = chapterInputs[sub.subjectId]?.[chapter.chapterId] ?? ''}
                {@const chapterTotal = clampChapterRaw(sub.subjectId, chapter.chapterId, chapterInput)}
                {@const chapterTopicSum = getTopicSum(sub.subjectId, chapter.chapterId)}
                {@const chapterOk = chapterIsValid(sub.subjectId, chapter.chapterId)}
                {@const chapterOpenKey = `${sub.subjectId}::${chapter.chapterId}`}
                {@const topicsOpen = openTopicRows.has(chapterOpenKey)}
                <li class="own-q-modal-unit own-q-modal-unit--chapter">
                  <div class="own-q-modal-unit__stack">
                    <div class="own-q-modal-unit__head">
                      <span class="own-q-modal-unit__name">{chapter.chapterName}</span>
                      <span class="own-q-modal-card__cap">Up to {chapter.maxQuestions}</span>
                      <input
                        type="number"
                        min="0"
                        max={chapter.maxQuestions}
                        class="own-q-modal-unit-input"
                        placeholder="0"
                        value={chapterInput}
                        oninput={(e) => setChapter(sub.subjectId, chapter.chapterId, (e.currentTarget as HTMLInputElement).value)}
                      />
                      <button type="button" class="own-q-modal-topic-toggle" onclick={() => toggleTopics(sub.subjectId, chapter.chapterId)}>
                        {topicsOpen ? 'Hide topics' : 'Show topics'}
                      </button>
                    </div>
                   
                    {#if topicsOpen}
                      <ul class="own-q-modal-topics" role="list">
                        {#each chapter.topics as topic (topic.topicId)}
                          <li class="own-q-modal-topic">
                            <span class="own-q-modal-unit__name">{topic.topicName}</span>
                            <span class="own-q-modal-card__cap">Up to {topic.maxQuestions}</span>
                            <input
                              type="number"
                              min="0"
                              max={topic.maxQuestions}
                              class="own-q-modal-unit-input"
                              placeholder="0"
                              value={topicInputs[sub.subjectId]?.[chapter.chapterId]?.[topic.topicId] ?? ''}
                              oninput={(e) => setTopic(sub.subjectId, chapter.chapterId, topic.topicId, (e.currentTarget as HTMLInputElement).value)}
                            />
                          </li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                </li>
              {/each}
            </ul>

            <div class="own-q-modal-summary">
              <span class:own-q-modal-match={subjectOk} class:own-q-modal-mismatch={!subjectOk}>
                Chapter total: {chapterSum} / Subject total: {subjectTotal}
              </span>
            </div>
          </section>
        {/each}
      </div>

      <div class="own-q-modal-actions">
        {#if errorMessage}
          <p class="own-q-modal-error-text">{errorMessage}</p>
        {/if}
        {#if effectiveMaxQuestionsMessage}
          <p class="own-q-modal-error-text">{effectiveMaxQuestionsMessage}</p>
        {/if}
        <div class="own-q-modal-actions-row">
          <button type="button" class="own-q-modal-btn own-q-modal-btn--ghost" onclick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" class="own-q-modal-btn own-q-modal-btn--primary" onclick={() => void handleContinue()} disabled={hasInvalidSubjects || submitting || Boolean(maxQuestionsError)}>
            {submitting ? 'Creating…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
