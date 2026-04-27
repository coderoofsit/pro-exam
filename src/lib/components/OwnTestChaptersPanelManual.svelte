<script lang="ts">
  import type { GroupedSubjectRow, GroupedChapterGroupRow } from '$lib/api/chapters';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { goto, afterNavigate } from '$app/navigation';

  afterNavigate(({ type }) => {
    if (!browser) return;
    // After navigating back/forward, scroll the open unit into view
    if (type === 'popstate' || type === 'leave') {
      const openUnitId = Array.from(openUnitIds)[0];
      if (!openUnitId) return;
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-unit-id="${openUnitId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  type Props = {
    groupedSubjects: GroupedSubjectRow[];
    examSlug: string;
    examId: string;
    boardId: string;
  };

  let { groupedSubjects, examSlug, examId, boardId }: Props = $props();

  function getInitialState() {
    if (!groupedSubjects || !groupedSubjects.length) return { subject: '', units: new Set<string>() };
    const validSubjectSlugs = new Set(groupedSubjects.map((g) => g.subject.slug));
    const subjectFromQuery = page.url.searchParams.get('subject') ?? '';
    const selectedSubject = validSubjectSlugs.has(subjectFromQuery)
      ? subjectFromQuery
      : groupedSubjects[0]?.subject?.slug || '';

    const allowedUnitIds = new Set(
      (groupedSubjects.find((g) => g.subject.slug === selectedSubject)?.data ?? []).map((u) =>
        String(u.chapterGroup._id)
      )
    );
    const unitIdsFromQuery = (page.url.searchParams.get('units') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((id) => allowedUnitIds.has(id));

    let units = new Set<string>();
    if (unitIdsFromQuery.length) {
      units = new Set([unitIdsFromQuery[0]]);
    } else {
      const row = groupedSubjects.find((g) => g.subject.slug === selectedSubject);
      const firstUnit = row?.data?.[0];
      const firstUnitId = firstUnit ? String(firstUnit.chapterGroup._id) : null;
      units = new Set(firstUnitId ? [firstUnitId] : []);
    }
    return { subject: selectedSubject, units };
  }

  const initialState = getInitialState();
  let openSubjectSlug = $state<string>(initialState.subject);
  let openUnitIds = $state<Set<string>>(initialState.units);
  let subjectRailOpen = $state(true);
  type ManualSelectedRow = {
    id: string;
    subjectId: string;
    chapterId: string;
    chapterGroupId: string;
    questionText?: string;
  };
  let manualSelectedRows = $state<ManualSelectedRow[]>([]);
  let openSelectedQuestionsForChapter = $state<Set<string>>(new Set());
  let openingChapterId = $state<string | null>(null);

  const manualSelectionKey = $derived(`own-manual-selected::${examSlug}`);
  $effect(() => {
    if (!browser) return;
    try {
      const raw = sessionStorage.getItem(manualSelectionKey);
      if (!raw) {
        manualSelectedRows = [];
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        manualSelectedRows = [];
        return;
      }

      if (parsed.every((x) => typeof x === 'string')) {
        const ids = (parsed as string[]).filter(Boolean);
        manualSelectedRows = ids.map((id) => ({
          id,
          subjectId: '',
          chapterId: '',
          chapterGroupId: ''
        }));
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({
          id: String(r?.id ?? ''),
          subjectId: String(r?.subjectId ?? '').trim(),
          chapterId: String(r?.chapterId ?? ''),
          chapterGroupId: String(r?.chapterGroupId ?? '').trim(),
          questionText: String(r?.questionText ?? '').trim()
        }))
        .filter((r) => r.id);
      manualSelectedRows = rows;
    } catch {
      manualSelectedRows = [];
    }
  });

  const questionCountByChapterId = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const row of manualSelectedRows) {
      if (row.chapterId) {
        counts.set(row.chapterId, (counts.get(row.chapterId) || 0) + 1);
      }
    }
    return counts;
  });

  const selectedQuestionsByChapterId = $derived.by(() => {
    const byChapter = new Map<string, Array<{ id: string; questionText: string }>>();
    for (const row of manualSelectedRows) {
      const chapter = String(row.chapterId ?? '').trim();
      if (!chapter) continue;
      const list = byChapter.get(chapter) ?? [];
      list.push({
        id: row.id,
        questionText: String(row.questionText ?? '').trim() || 'Selected question'
      });
      byChapter.set(chapter, list);
    }
    return byChapter;
  });

  

  function firstUnitIdForSubject(slug: string): string | null {
    const row = groupedSubjects.find((g) => g.subject.slug === slug);
    const firstUnit = row?.data?.[0];
    return firstUnit ? String(firstUnit.chapterGroup._id) : null;
  }

  $effect(() => {
    if (!groupedSubjects.length) return;
    const validSubjectSlugs = new Set(groupedSubjects.map((g) => g.subject.slug));
    const subjectFromQuery = page.url.searchParams.get('subject') ?? '';
    const selectedSubject = validSubjectSlugs.has(subjectFromQuery)
      ? subjectFromQuery
      : (validSubjectSlugs.has(openSubjectSlug) ? openSubjectSlug : groupedSubjects[0]?.subject?.slug || '');

    openSubjectSlug = selectedSubject;

    const allowedUnitIds = new Set(
      (groupedSubjects.find((g) => g.subject.slug === selectedSubject)?.data ?? []).map((u) =>
        String(u.chapterGroup._id)
      )
    );
    const unitIdsFromQuery = (page.url.searchParams.get('units') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((id) => allowedUnitIds.has(id));

    if (unitIdsFromQuery.length) {
      openUnitIds = new Set([unitIdsFromQuery[0]]);
    } else {
      const firstUnitId = firstUnitIdForSubject(selectedSubject);
      openUnitIds = new Set(firstUnitId ? [firstUnitId] : []);
    }
  });

  $effect(() => {
    if (!browser || !openSubjectSlug) return;
    const url = new URL(window.location.href);
    url.searchParams.set('subject', openSubjectSlug);
    if (openUnitIds.size > 0) {
      url.searchParams.set('units', Array.from(openUnitIds).join(','));
    } else {
      url.searchParams.delete('units');
    }
    window.history.replaceState(window.history.state, '', url.toString());
  });



  const openSubject = $derived(
    groupedSubjects.find((g) => g.subject.slug === openSubjectSlug) ?? null
  );

  const openPaletteIndex = $derived.by(() => {
    const idx = groupedSubjects.findIndex((g) => g.subject.slug === openSubjectSlug);
    return idx >= 0 ? idx % 4 : 0;
  });

  function unitCount(row: GroupedSubjectRow) {
    return row.data?.length ?? 0;
  }

  function onSubjectCardClick(slug: string, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('a')) return;
    openSubjectSlug = slug;
    const firstUnitId = firstUnitIdForSubject(slug);
    openUnitIds = new Set(firstUnitId ? [firstUnitId] : []);
  }

  function onSubjectCardKeydown(slug: string, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSubjectCardClick(slug, e as unknown as MouseEvent);
    }
  }

  function toggleUnitOpen(unitId: string) {
    if (openUnitIds.has(unitId)) {
      openUnitIds = new Set();
    } else {
      openUnitIds = new Set([unitId]);
    }
  }

  function toggleChapterSelectedQuestions(chapterId: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = new Set(openSelectedQuestionsForChapter);
    if (next.has(chapterId)) next.delete(chapterId);
    else next.add(chapterId);
    openSelectedQuestionsForChapter = next;
  }

  function removeSelectedQuestion(questionId: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    manualSelectedRows = manualSelectedRows.filter((r) => r.id !== questionId);
    try {
      sessionStorage.setItem(manualSelectionKey, JSON.stringify(manualSelectedRows));
    } catch {
      // ignore storage failures; UI state is still updated
    }
  }

  function chapterHref(chapterSlug: string, topicSlug?: string) {
    const q = new URLSearchParams({ mode: 'manual', examId, boardId, subject: openSubjectSlug });
    if (openUnitIds.size > 0) q.set('units', Array.from(openUnitIds).join(','));
    if (topicSlug) q.set('topic', topicSlug);
    return `/student/tests/own/${encodeURIComponent(examSlug)}/chapter/${encodeURIComponent(chapterSlug)}?${q}`;
  }

  async function openChapter(chapterSlug: string, topicSlug: string, topicId: string) {
    if (openingChapterId) return;
    openingChapterId = topicId;
    try {
      await goto(chapterHref(chapterSlug, topicSlug));
    } finally {
      openingChapterId = null;
    }
  }

</script>

<div
  class="own-test-chapters-root flex flex-col"
  data-exam-slug={examSlug}
  data-own-panel="manual"
>

  <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
  <aside
    id="own-subject-rail-manual"
    class="own-test-subject-rail flex w-full shrink-0 flex-col gap-2
      lg:sticky lg:top-0 lg:z-10 lg:w-[260px] lg:self-start
      lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
      {subjectRailOpen ? '' : 'hidden'}"
    aria-label="Subjects"
  >
    {#each groupedSubjects as row, i (row.subject._id)}
      {@const accentIdx = i % 4}
      {@const isOpen = openSubjectSlug === row.subject.slug}
      {@const n = unitCount(row)}

      <div
        class="own-subject-card"
        class:own-subject-card--open={isOpen}
        data-own-accent={accentIdx}
        role="button"
        tabindex="0"
        onclick={(e) => onSubjectCardClick(row.subject.slug, e)}
        onkeydown={(e) => onSubjectCardKeydown(row.subject.slug, e)}
      >
        <div class="own-subject-card__row own-subject-card__row--manual">
          <div class="min-w-0 flex-1">
            <p class="own-subject-card__title">{row.subject.name?.en ?? row.subject.slug}</p>
            <p class="own-subject-card__meta">
              {n} chapter{n === 1 ? '' : 's'}
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
        {#each openSubject.data as unit (unit.chapterGroup._id)}
          {@const uid = unit.chapterGroup._id}
          {@const isOpen = openUnitIds.has(uid)}
          {@const totalCh = unit.data.length}

          <div class="own-unit" class:own-unit--open={isOpen} data-unit-id={uid}>
            <div class="own-unit__head own-unit__head--manual">
              <button
                type="button"
                class="own-unit__trigger"
                onclick={() => toggleUnitOpen(uid)}
                aria-expanded={isOpen}
              >
                <span class="min-w-0 flex-1 text-left">
                  {unit.chapterGroup.name?.en ?? unit.chapterGroup.slug}
                </span>

                <span class="own-unit__count flex flex-col items-end">
                  <span>{totalCh} topics</span>
                  {#if (questionCountByChapterId.get(uid) ?? 0) > 0}
                    <span class="text-[10px] text-[var(--own-muted)]">{questionCountByChapterId.get(uid)} selected</span>
                  {/if}
                </span>

                <span class="own-unit__chev" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>

            {#if isOpen}
              <div class="own-unit__body">
                <ul class="mt-3 flex flex-col gap-2">
                  {#each unit.data as ch (ch._id)}
                    {@const qCount = questionCountByChapterId.get(ch._id) || 0}
                    {@const selectedQuestions = selectedQuestionsByChapterId.get(ch._id) ?? []}
                    {@const questionsOpen = openSelectedQuestionsForChapter.has(ch._id)}
                    <li>
                      <div class="own-chapter-row own-chapter-row--manual flex w-full items-center gap-2 border-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--page-link)_10%,var(--sh-exam-card-bg))] transition-colors hover:border-[var(--page-link)]/55 hover:bg-[color-mix(in_srgb,var(--page-link)_16%,var(--sh-exam-card-bg))]">
                        <button
                          type="button"
                          class="flex min-w-0 flex-1 items-center gap-2 text-left"
                          disabled={openingChapterId !== null}
                          aria-busy={openingChapterId === ch._id}
                          onclick={() => void openChapter(unit.chapterGroup.slug, ch.slug, ch._id)}
                        >
                          <span class="own-chapter__label">{ch.name?.en ?? ch.slug}</span>
                        </button>
                        {#if qCount > 0}
                          <button
                            type="button"
                            class="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--page-link)_24%,var(--sh-exam-card-border))] bg-[var(--page-card-bg)] px-2 text-xs leading-none text-[var(--page-text-muted)] hover:border-[var(--page-link)] hover:text-[var(--page-link)]"
                            aria-expanded={questionsOpen}
                            onclick={(e) => toggleChapterSelectedQuestions(ch._id, e)}
                          >
                            {qCount} q.
                            <span class={`inline-flex items-center transition-transform ${questionsOpen ? 'rotate-180' : ''}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            </span>
                          </button>
                        {/if}
                        <button
                          type="button"
                          class="own-chapter__next shrink-0"
                          disabled={openingChapterId !== null}
                          aria-busy={openingChapterId === ch._id}
                          aria-label={`Open ${ch.name?.en ?? ch.slug}`}
                          onclick={() => void openChapter(unit.chapterGroup.slug, ch.slug, ch._id)}
                        >
                          {#if openingChapterId === ch._id}
                            <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
                          {:else}
                            <span aria-hidden="true">→</span>
                          {/if}
                        </button>
                      </div>
                      {#if questionsOpen && selectedQuestions.length > 0}
                        <div class="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--page-link)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--page-link)_10%,var(--sh-exam-card-bg))] p-2">
                          <ul class="space-y-1.5">
                            {#each selectedQuestions as selected, idx (selected.id)}
                              <li class="flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--page-link)_8%,var(--sh-exam-card-bg))] px-2 py-1.5 transition-colors hover:border-[var(--page-link)]/50 hover:bg-[color-mix(in_srgb,var(--page-link)_14%,var(--sh-exam-card-bg))]">
                                <p class="min-w-0 flex-1 break-words text-xs text-[var(--page-text)]">
                                  <span class="mr-1.5 text-[var(--page-text-muted)]">{idx + 1}.</span>{selected.questionText}
                                </p>
                                <button
                                  type="button"
                                  class="shrink-0 rounded-md border border-[var(--page-link)]/45 px-2 py-0.5 text-[11px] text-[var(--page-link)] hover:bg-[var(--page-link)]/10"
                                  onclick={(e) => removeSelectedQuestion(selected.id, e)}
                                >
                                  Remove
                                </button>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm own-muted-text">Select a subject to view units.</p>
    {/if}
  </div>
  </div>
</div>
