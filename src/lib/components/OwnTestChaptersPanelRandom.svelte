<script lang="ts">
  import type { TopicsByExamChapterRow, TopicsByExamSubjectRow } from '$lib/api/topics';
  import type {
    OwnTestChapterSelection,
    OwnTestSelectionSnapshot,
    OwnTestSubjectSelection,
    OwnTestTopicSelection
  } from '$lib/ownTest/questionDistribution';

  type Props = {
    groupedSubjects: TopicsByExamSubjectRow[];
    examSlug: string;
    examId?: string;
    boardId?: string;
    onNext?: (snapshot: OwnTestSelectionSnapshot) => void;
  };

  let { groupedSubjects, examSlug, examId = '', boardId = '', onNext }: Props = $props();

  type NormalizedTopic = {
    _id: string;
    topicSlug: string;
    topic: { en?: string; hi?: string };
    numberOfQuestions: number;
  };

  type NormalizedChapter = {
    chapter: { _id: string; slug: string; name?: { en?: string; hi?: string } };
    data: NormalizedTopic[];
  };

  type NormalizedSubject = {
    subject: { _id: string; slug: string; name?: { en?: string; hi?: string } };
    data: NormalizedChapter[];
  };

  const safeGroupedSubjects = $derived.by<NormalizedSubject[]>(() => {
    const rows = Array.isArray(groupedSubjects) ? groupedSubjects : [];
    const out: NormalizedSubject[] = [];
    for (const [rowIndex, row] of rows.entries()) {
      const rawSubject = row?.subject ?? ({} as any);
      const subjectId = String(rawSubject?._id ?? '').trim() || `subject-${rowIndex}`;
      const subjectSlug =
        String(rawSubject?.slug ?? '').trim() ||
        String(rawSubject?.name?.en ?? '').trim().toLowerCase().replace(/\s+/g, '-') ||
        subjectId;
      const subjectNameEn =
        String(rawSubject?.name?.en ?? '').trim() || String(rawSubject?.slug ?? '').trim() || 'Subject';

      const rawChapters = Array.isArray(row?.data) ? row.data : [];
      const chapters: NormalizedChapter[] = [];

      for (const [chapterIndex, chapterRow] of rawChapters.entries()) {
        const rawChapter = chapterRow?.chapter ?? ({} as any);
        const chapterId = String(rawChapter?._id ?? '').trim() || `chapter-${rowIndex}-${chapterIndex}`;
        const chapterSlug =
          String(rawChapter?.slug ?? '').trim() ||
          String(rawChapter?.name?.en ?? '').trim().toLowerCase().replace(/\s+/g, '-') ||
          chapterId;
        const chapterNameEn =
          String(rawChapter?.name?.en ?? '').trim() || String(rawChapter?.slug ?? '').trim() || 'Chapter';

        const rawTopics = Array.isArray(chapterRow?.data) ? chapterRow.data : [];
        const topics: NormalizedTopic[] = [];

        for (const [topicIndex, topicRow] of rawTopics.entries()) {
          const topicId = String(topicRow?._id ?? '').trim() || `topic-${rowIndex}-${chapterIndex}-${topicIndex}`;
          const topicSlug =
            String(topicRow?.topicSlug ?? '').trim() ||
            String(topicRow?.topic?.en ?? '').trim().toLowerCase().replace(/\s+/g, '-') ||
            topicId;
          const topicNameEn =
            String(topicRow?.topic?.en ?? '').trim() || String(topicRow?.topicSlug ?? '').trim() || 'Topic';
          topics.push({
            _id: topicId,
            topicSlug,
            topic: { en: topicNameEn, hi: topicRow?.topic?.hi },
            numberOfQuestions: Math.max(0, Number(topicRow?.numberOfQuestions) || 0)
          });
        }

        chapters.push({
          chapter: { _id: chapterId, slug: chapterSlug, name: { en: chapterNameEn, hi: rawChapter?.name?.hi } },
          data: topics
        });
      }

      out.push({
        subject: { _id: subjectId, slug: subjectSlug, name: { en: subjectNameEn, hi: rawSubject?.name?.hi } },
        data: chapters
      });
    }
    return out;
  });

  let openSubjectSlug = $state<string>('');
  let openChapterIds = $state<Set<string>>(new Set());
  let subjectRailOpen = $state(true);
  let checkedChapters = $state<Set<string>>(new Set());
  let checkedTopics = $state<Set<string>>(new Set());

  $effect(() => {
    const first = safeGroupedSubjects[0]?.subject?.slug;
    if (!first || openSubjectSlug) return;
    openSubjectSlug = first;
  });

  const openSubject = $derived(safeGroupedSubjects.find((g) => g.subject.slug === openSubjectSlug) ?? null);
  const openPaletteIndex = $derived.by(() => {
    const idx = safeGroupedSubjects.findIndex((g) => g.subject.slug === openSubjectSlug);
    return idx >= 0 ? idx % 4 : 0;
  });

  function setIndeterminate(node: HTMLInputElement, value: boolean) {
    node.indeterminate = value;
    return { update(v: boolean) { node.indeterminate = v; } };
  }

  function chapterTopicStats(chapter: TopicsByExamChapterRow): { total: number; sel: number } {
    const topics = (chapter?.data ?? []).filter((topic) => topic?._id);
    const total = topics.length;
    const sel = topics.filter((topic) => checkedTopics.has(topic._id)).length;
    return { total, sel };
  }

  function subjectChapterStats(row: TopicsByExamSubjectRow): { total: number; sel: number } {
    const chapters = (row?.data ?? []).filter((ch) => ch?.chapter?._id && Array.isArray(ch?.data));
    const total = chapters.length;
    const sel = chapters.filter((ch) => ch.data.some((topic) => topic?._id && checkedTopics.has(topic._id))).length;
    return { total, sel };
  }

  function chaptersWithAnyTopicInSubject(row: TopicsByExamSubjectRow): number {
    return (row?.data ?? []).filter(
      (chapter) =>
        chapter?.chapter?._id &&
        (chapter?.data ?? []).some((topic) => topic?._id && checkedTopics.has(topic._id))
    ).length;
  }

  function checkAllUnderSubject(slug: string) {
    const row = safeGroupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return;
    const nc = new Set(checkedChapters);
    const nt = new Set(checkedTopics);
    for (const ch of row.data) {
      nc.add(ch.chapter._id);
      for (const topic of ch.data) nt.add(topic._id);
    }
    checkedChapters = nc;
    checkedTopics = nt;
  }

  function uncheckAllUnderSubject(slug: string) {
    const row = safeGroupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return;
    const nc = new Set(checkedChapters);
    const nt = new Set(checkedTopics);
    for (const ch of row.data) {
      nc.delete(ch.chapter._id);
      for (const topic of ch.data) nt.delete(topic._id);
    }
    checkedChapters = nc;
    checkedTopics = nt;
  }

  function subjectIsFullySelected(slug: string): boolean {
    const row = safeGroupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return false;
    const { total, sel } = subjectChapterStats(row);
    return total > 0 && sel === total;
  }

  function onSubjectCardClick(slug: string, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.own-check')) return;
    openSubjectSlug = slug;
    openChapterIds = new Set();
    const row = safeGroupedSubjects.find((g) => g.subject.slug === slug);
    if (row && subjectChapterStats(row).sel === 0) checkAllUnderSubject(slug);
  }

  function onSubjectCardKeydown(slug: string, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSubjectCardClick(slug, e as unknown as MouseEvent);
    }
  }

  function toggleSubjectCheck(slug: string) {
    if (subjectIsFullySelected(slug)) uncheckAllUnderSubject(slug);
    else checkAllUnderSubject(slug);
  }

  function toggleChapterCheck(chapter: TopicsByExamChapterRow, e: Event) {
    e.stopPropagation();
    const chapterId = chapter.chapter._id;
    const nc = new Set(checkedChapters);
    const nt = new Set(checkedTopics);
    if (nc.has(chapterId)) {
      nc.delete(chapterId);
      for (const topic of chapter.data) nt.delete(topic._id);
    } else {
      nc.add(chapterId);
      for (const topic of chapter.data) nt.add(topic._id);
    }
    checkedChapters = nc;
    checkedTopics = nt;
  }

  function toggleTopicCheck(topicId: string, chapter: TopicsByExamChapterRow) {
    const nt = new Set(checkedTopics);
    if (nt.has(topicId)) nt.delete(topicId);
    else nt.add(topicId);
    checkedTopics = nt;

    const chapterId = chapter.chapter._id;
    const nc = new Set(checkedChapters);
    const hasAny = chapter.data.some((topic) => nt.has(topic._id));
    if (hasAny) nc.add(chapterId);
    else nc.delete(chapterId);
    checkedChapters = nc;
  }

  function toggleChapterOpen(chapterId: string) {
    const next = new Set(openChapterIds);
    if (next.has(chapterId)) next.delete(chapterId);
    else next.add(chapterId);
    openChapterIds = next;
  }

  function selectAllTopicsInChapter(chapter: TopicsByExamChapterRow) {
    const nc = new Set(checkedChapters);
    const nt = new Set(checkedTopics);
    nc.add(chapter.chapter._id);
    for (const topic of chapter.data) nt.add(topic._id);
    checkedChapters = nc;
    checkedTopics = nt;
  }

  function unselectAllTopicsInChapter(chapter: TopicsByExamChapterRow) {
    const nc = new Set(checkedChapters);
    const nt = new Set(checkedTopics);
    nc.delete(chapter.chapter._id);
    for (const topic of chapter.data) nt.delete(topic._id);
    checkedChapters = nc;
    checkedTopics = nt;
  }

  const selectedSubjectsForBar = $derived.by(() => {
    const out: { id: string; name: string; accent: number }[] = [];
    for (const [i, row] of safeGroupedSubjects.entries()) {
      if (subjectChapterStats(row).sel > 0) {
        out.push({
          id: row.subject._id,
          name: row.subject.name?.en ?? row.subject.slug,
          accent: i % 4
        });
      }
    }
    return out;
  });

  const selectedTopicCount = $derived(checkedTopics.size);

  function buildSelectionSnapshot(): OwnTestSelectionSnapshot | null {
    const subjects: OwnTestSubjectSelection[] = [];
    const resolvedExamId = String(examId ?? '').trim();
    const resolvedBoardId = String(boardId ?? '').trim();

    for (const [i, row] of safeGroupedSubjects.entries()) {
      const chapters: OwnTestChapterSelection[] = [];
      for (const chapterRow of row.data) {
        const selectedTopics = chapterRow.data.filter((topic) => checkedTopics.has(topic._id));
        if (selectedTopics.length === 0) continue;

        const topics: OwnTestTopicSelection[] = selectedTopics.map((topic) => ({
          topicId: topic._id,
          topicName: topic.topic.en ?? topic.topicSlug,
          maxQuestions: Math.max(0, Number(topic.numberOfQuestions) || 0)
        }));

        chapters.push({
          chapterId: chapterRow.chapter._id,
          chapterName: chapterRow.chapter.name?.en ?? chapterRow.chapter.slug,
          maxQuestions: topics.reduce((sum, t) => sum + t.maxQuestions, 0),
          topicIds: topics.map((t) => t.topicId),
          topics
        });
      }

      if (chapters.length === 0) continue;
      subjects.push({
        subjectId: row.subject._id,
        subjectSlug: row.subject.slug,
        subjectName: row.subject.name?.en ?? row.subject.slug,
        accent: i % 4,
        chapters,
        maxQuestions: chapters.reduce((sum, ch) => sum + ch.maxQuestions, 0)
      });
    }

    if (subjects.length === 0) return null;
    return { examId: resolvedExamId, boardId: resolvedBoardId, subjects };
  }

  function handleNextClick() {
    const snap = buildSelectionSnapshot();
    if (!snap) return;
    onNext?.(snap);
  }
</script>

<div class="own-test-chapters-root flex flex-col" data-exam-slug={examSlug}>
  <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
    <aside
      id="own-subject-rail"
      class="own-test-subject-rail flex w-full shrink-0 flex-col gap-2
      lg:sticky lg:top-0 lg:z-10 lg:w-[260px] lg:self-start
      lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      {subjectRailOpen ? '' : 'hidden'}"
      aria-label="Subjects"
    >
      {#each safeGroupedSubjects as row, i (row.subject._id)}
        {@const accentIdx = i % 4}
        {@const isOpen = openSubjectSlug === row.subject.slug}
        {@const chStats = subjectChapterStats(row)}
        {@const subjFull = chStats.total > 0 && chStats.sel === chStats.total}
        {@const subjIndeterminate = chStats.sel > 0 && chStats.sel < chStats.total}
        {@const hasSubjectSelection = chStats.sel > 0}
        {@const selChapters = chaptersWithAnyTopicInSubject(row)}
        {@const totalChapters = row.data?.length ?? 0}

        <div
          class="own-subject-card"
          class:own-subject-card--selected={hasSubjectSelection}
          class:own-subject-card--open={isOpen}
          data-own-accent={accentIdx}
          role="button"
          tabindex="0"
          onclick={(e) => onSubjectCardClick(row.subject.slug, e)}
          onkeydown={(e) => onSubjectCardKeydown(row.subject.slug, e)}
        >
          <div class="own-subject-card__row">
            <label class="own-check">
              <input
                type="checkbox"
                checked={subjFull}
                use:setIndeterminate={subjIndeterminate}
                onchange={() => toggleSubjectCheck(row.subject.slug)}
                aria-label="Select subject {row.subject.name?.en ?? row.subject.slug}"
              />
              <span class="own-check__visual" data-own-accent={accentIdx}></span>
            </label>

            <div class="min-w-0 flex-1">
              <p class="own-subject-card__title">{row.subject.name?.en ?? row.subject.slug}</p>
              <p class="own-subject-card__meta">
                {#if selChapters > 0}
                  <span class="own-subject-card__meta--sel">{selChapters} / {totalChapters}</span>
                  &nbsp;chapter{totalChapters === 1 ? '' : 's'} selected
                {:else}
                  {totalChapters} chapter{totalChapters === 1 ? '' : 's'}
                {/if}
              </p>
            </div>
          </div>
        </div>
      {/each}
    </aside>

    <div class="min-w-0 flex-1 lg:min-h-[min(60vh,480px)]">
      <div class="mb-4 lg:hidden">
        <h2 class="own-section-label">Chapters &amp; topics</h2>
      </div>
      {#if openSubject}
        <div class="own-units flex flex-col gap-3" data-own-palette={openPaletteIndex}>
          {#each openSubject.data as chapter (chapter.chapter._id)}
            {@const chapterId = chapter.chapter._id}
            {@const isOpen = openChapterIds.has(chapterId)}
            {@const tStats = chapterTopicStats(chapter)}
            {@const chapterFull = tStats.total > 0 && tStats.sel === tStats.total}
            {@const chapterIndeterminate = tStats.sel > 0 && tStats.sel < tStats.total}
            {@const chapterMax = chapter.data.reduce((sum, topic) => sum + Math.max(0, Number(topic.numberOfQuestions) || 0), 0)}

            <div class="own-unit" class:own-unit--open={isOpen}>
              <div class="own-unit__head">
                <label class="own-check">
                  <input
                    type="checkbox"
                    checked={chapterFull}
                    use:setIndeterminate={chapterIndeterminate}
                    onchange={(e) => toggleChapterCheck(chapter, e)}
                    aria-label="Select chapter {chapter.chapter.name?.en ?? chapter.chapter.slug}"
                  />
                  <span class="own-check__visual" data-own-accent={openPaletteIndex}></span>
                </label>
                <button
                  type="button"
                  class="own-unit__trigger"
                  onclick={() => toggleChapterOpen(chapterId)}
                  aria-expanded={isOpen}
                >
                  <span class="min-w-0 flex-1 text-left">{chapter.chapter.name?.en ?? chapter.chapter.slug}</span>
                  <span class="own-unit__count">{tStats.sel}/{tStats.total}</span>
                  <span class="own-unit__chev" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                </button>
              </div>
              {#if isOpen}
                <div class="own-unit__body">
                  <div class="mb-2 text-xs text-[var(--page-text-muted)]">Up to {chapterMax} questions</div>
                  <div class="own-unit__chapter-actions" role="group" aria-label="Topics in {chapter.chapter.name?.en ?? chapter.chapter.slug}">
                    <button type="button" class="own-unit__chapter-action" onclick={() => selectAllTopicsInChapter(chapter)}>Select all</button>
                    <button type="button" class="own-unit__chapter-action" onclick={() => unselectAllTopicsInChapter(chapter)}>Unselect all</button>
                  </div>
                  <ul class="mt-3 flex flex-col gap-2">
                    {#each chapter.data as topic (topic._id)}
                      {@const max = Math.max(0, Number(topic.numberOfQuestions) || 0)}
                      <li>
                        <div class="own-chapter-row w-full">
                          <label class="own-check">
                            <input
                              type="checkbox"
                              checked={checkedTopics.has(topic._id)}
                              onchange={() => toggleTopicCheck(topic._id, chapter)}
                              aria-label="Select topic {topic.topic.en ?? topic.topicSlug}"
                            />
                            <span class="own-check__visual" data-own-accent={openPaletteIndex}></span>
                          </label>
                          <span class="own-chapter__label">{topic.topic.en ?? topic.topicSlug} <span class="text-xs opacity-70">({max})</span></span>
                        </div>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm own-muted-text">Select a subject to view chapters and topics.</p>
      {/if}
    </div>
  </div>

  <footer class="own-bottom-bar" aria-label="Selection summary">
    <div class="own-bottom-bar__subject">
      <span class="own-bottom-bar__label">Selected topics</span>
      {#if selectedTopicCount > 0}
        <ul class="own-bottom-bar__list" role="list">
          {#each selectedSubjectsForBar as s (s.id)}
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
      disabled={selectedTopicCount === 0}
      onclick={handleNextClick}
    >
      Next
    </button>
  </footer>
</div>
