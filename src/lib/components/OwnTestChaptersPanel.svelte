<script lang="ts">
  import type { GroupedSubjectRow, GroupedChapterGroupRow } from '$lib/api/chapters';
  import {
  getMaxQuestionsForUnits,
  type OwnTestSelectionSnapshot,
  type OwnTestSubjectSelection,
  type OwnTestUnitSelection
} from '$lib/ownTest/questionDistribution';

  type Props = {
    groupedSubjects: GroupedSubjectRow[];
    examSlug: string;
    /** Fallbacks when grouped API rows omit ids (required for create-random-test). */
    examId?: string;
    boardId?: string;
    onNext?: (snapshot: OwnTestSelectionSnapshot) => void;
  };

  let { groupedSubjects, examSlug, examId = '', boardId = '', onNext }: Props = $props();

  let openSubjectSlug = $state<string>(''); 
  let openUnitIds          = $state<Set<string>>(new Set());  

  let checkedUnits = $state<Set<string>>(new Set());
  let checkedChapters = $state<Set<string>>(new Set());

  $effect(() => {
    const first = groupedSubjects[0]?.subject?.slug;
    if (!first) return;
    if (!openSubjectSlug) {
      openSubjectSlug = first;
      openUnitIds = new Set();
    }
  });

  const openSubject = $derived(
    groupedSubjects.find(g => g.subject.slug === openSubjectSlug) ?? null
  );

  const openPaletteIndex = $derived.by(() => {
    const idx = groupedSubjects.findIndex(g => g.subject.slug === openSubjectSlug);
    return idx >= 0 ? idx % 4 : 0;
  });

  function selectedChaptersInUnit(unit: GroupedChapterGroupRow): number {
    return unit.data.filter(ch => checkedChapters.has(ch._id)).length;
  }

  function unitsWithAnyChapterInSubject(row: GroupedSubjectRow): number {
    return row.data.filter((u) => u.data.some((ch) => checkedChapters.has(ch._id))).length;
  }

  function subjectChapterStats(row: GroupedSubjectRow): { total: number; sel: number } {
    let total = 0;
    let sel = 0;
    for (const u of row.data) {
      for (const ch of u.data) {
        total++;
        if (checkedChapters.has(ch._id)) sel++;
      }
    }
    return { total, sel };
  }

  function unitChapterStats(unit: GroupedChapterGroupRow): { total: number; sel: number } {
    const total = unit.data.length;
    const sel = unit.data.filter((ch) => checkedChapters.has(ch._id)).length;
    return { total, sel };
  }

  function setIndeterminate(node: HTMLInputElement, value: boolean) {
    node.indeterminate = value;
    return {
      update(v: boolean) {
        node.indeterminate = v;
      }
    };
  }
  function checkAllUnderSubject(slug: string) {
    const row = groupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return;
    const nu = new Set(checkedUnits);
    const nc = new Set(checkedChapters);
    for (const u of row.data) {
      nu.add(u.chapterGroup._id);
      for (const ch of u.data) nc.add(ch._id);
    }
    checkedUnits = nu;
    checkedChapters = nc;
  }

  function uncheckAllUnderSubject(slug: string) {
    const row = groupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return;
    const nu = new Set(checkedUnits);
    const nc = new Set(checkedChapters);
    for (const u of row.data) {
      nu.delete(u.chapterGroup._id);
      for (const ch of u.data) nc.delete(ch._id);
    }
    checkedUnits = nu;
    checkedChapters = nc;
  }

  function subjectIsFullySelected(slug: string): boolean {
    const row = groupedSubjects.find((g) => g.subject.slug === slug);
    if (!row) return false;
    const { total, sel } = subjectChapterStats(row);
    return total > 0 && sel === total;
  }

  function onSubjectCardClick(slug: string, e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.own-check')) return;
    openSubjectSlug = slug;
    openUnitIds = new Set();
    const row = groupedSubjects.find((g) => g.subject.slug === slug);
    if (row && subjectChapterStats(row).sel === 0) {
      checkAllUnderSubject(slug);
    }
  }

  function onSubjectCardKeydown(slug: string, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSubjectCardClick(slug, e as unknown as MouseEvent);
    }
  }

  function toggleSubjectCheck(slug: string) {
    if (subjectIsFullySelected(slug)) {
      uncheckAllUnderSubject(slug);
    } else {
      checkAllUnderSubject(slug);
    }
  }

  function toggleUnitCheck(unit: GroupedChapterGroupRow, e: Event) {
    e.stopPropagation();
    const id = unit.chapterGroup._id;
    const nu = new Set(checkedUnits);
    const nc = new Set(checkedChapters);
    if (nu.has(id)) {
      nu.delete(id);
      for (const ch of unit.data) nc.delete(ch._id);
    } else {
      nu.add(id);
      for (const ch of unit.data) nc.add(ch._id);
    }
    checkedUnits = nu;
    checkedChapters = nc;
  }

  function toggleChapterCheck(chapterId: string, unit: GroupedChapterGroupRow) {
    const nc = new Set(checkedChapters);
    if (nc.has(chapterId)) nc.delete(chapterId); else nc.add(chapterId);
    checkedChapters = nc;
    const allCh = unit.data.every(ch => nc.has(ch._id));
    const nu = new Set(checkedUnits);
    if (allCh && unit.data.length > 0) nu.add(unit.chapterGroup._id);
    else nu.delete(unit.chapterGroup._id);
    checkedUnits = nu;
  }

  function toggleUnitOpen(unitId: string) {
    const next = new Set(openUnitIds);
    if (next.has(unitId)) next.delete(unitId); else next.add(unitId);
    openUnitIds = next;
  }

  const selectedUnitsSummary = $derived.by(() => {
    const items: { name: string; accent: number }[] = [];
    for (const [si, row] of groupedSubjects.entries()) {
      const accentIdx = si % 4;
      for (const unit of row.data) {
        if (unit.data.some((ch) => checkedChapters.has(ch._id))) {
          items.push({
            name: unit.chapterGroup.name?.en ?? unit.chapterGroup.slug,
            accent: accentIdx
          });
        }
      }
    }
    return items;
  });

  const selectedSubjectsForBar = $derived.by(() => {
    const out: { id: string; name: string; accent: number }[] = [];
    for (const [i, row] of groupedSubjects.entries()) {
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

  function buildSelectionSnapshot(): OwnTestSelectionSnapshot | null {
  const subjects: OwnTestSubjectSelection[] = [];
  let resolvedExamId = (examId || '').trim();
  let resolvedBoardId = (boardId || '').trim();

  for (const [i, row] of groupedSubjects.entries()) {
    if (subjectChapterStats(row).sel === 0) continue;

    const units: OwnTestUnitSelection[] = [];

    for (const unit of row.data) {
      const chapterIds = unit.data
        .filter((ch) => checkedChapters.has(ch._id))
        .map((ch) => ch._id);

      if (chapterIds.length === 0) continue;

      units.push({
        unitId: unit.chapterGroup._id,
        unitName: unit.chapterGroup.name?.en ?? unit.chapterGroup.slug,
        chapterIds
      });
    }

    if (units.length === 0) continue;

    if (!resolvedExamId || !resolvedBoardId) {
      const rExam = (row.examId ?? '').trim();
      const rBoard = (row.boardId ?? '').trim();
      if (rExam) resolvedExamId = resolvedExamId || rExam;
      if (rBoard) resolvedBoardId = resolvedBoardId || rBoard;
    }

    subjects.push({
      subjectId: row.subject._id,
      subjectSlug: row.subject.slug,
      subjectName: row.subject.name?.en ?? row.subject.slug,
      accent: i % 4,
      units,
      maxQuestions: getMaxQuestionsForUnits(units.length)
    });
  }

  return subjects.length ? { examId: resolvedExamId, boardId: resolvedBoardId, subjects } : null;
}

  function handleNextClick() {
    const snap = buildSelectionSnapshot();
    if (!snap) return;
    onNext?.(snap);
  }
</script>

<div
  class="own-test-chapters-root flex flex-col"
  data-exam-slug={examSlug}
>
  <div
    class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10"
  >
  <aside
    class="own-test-subject-rail flex w-full shrink-0 flex-col gap-2
      lg:sticky lg:top-0 lg:z-10 lg:w-[260px] lg:self-start
      lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto
      [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    aria-label="Subjects"
  >
    {#each groupedSubjects as row, i (row.subject._id)}
      {@const accentIdx = i % 4}
      {@const isOpen = openSubjectSlug === row.subject.slug}
      {@const chStats = subjectChapterStats(row)}
      {@const subjFull = chStats.total > 0 && chStats.sel === chStats.total}
      {@const subjIndeterminate = chStats.sel > 0 && chStats.sel < chStats.total}
      {@const hasSubjectSelection = chStats.sel > 0}
      {@const selUnits = unitsWithAnyChapterInSubject(row)}
      {@const totalUnits = row.data?.length ?? 0}

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
              {#if selUnits > 0}
                <span class="own-subject-card__meta--sel">{selUnits} / {totalUnits}</span>
                &nbsp;unit{totalUnits === 1 ? '' : 's'} selected
              {:else}
                {totalUnits} unit{totalUnits === 1 ? '' : 's'}
              {/if}
            </p>
          </div>
        </div>
      </div>
    {/each}
  </aside>

  <div class="min-w-0 flex-1 lg:min-h-[min(60vh,480px)]">
    <div class="mb-4 lg:hidden">
      <h2 class="own-section-label">Units &amp; chapters</h2>
    </div>

    {#if openSubject}
      <div class="own-units flex flex-col gap-3" data-own-palette={openPaletteIndex}>
        {#each openSubject.data as unit (unit.chapterGroup._id)}
          {@const uid = unit.chapterGroup._id}
          {@const isOpen = openUnitIds.has(uid)}
          {@const uStats = unitChapterStats(unit)}
          {@const unitFull = uStats.total > 0 && uStats.sel === uStats.total}
          {@const unitIndeterminate = uStats.sel > 0 && uStats.sel < uStats.total}
          {@const selCh = selectedChaptersInUnit(unit)}
          {@const totalCh = unit.data.length}

          <div class="own-unit" class:own-unit--open={isOpen}>

            <div class="own-unit__head">
              <label class="own-check">
                <input
                  type="checkbox"
                  checked={unitFull}
                  use:setIndeterminate={unitIndeterminate}
                  onchange={(e) => toggleUnitCheck(unit, e)}
                  aria-label="Select unit {unit.chapterGroup.name?.en ?? unit.chapterGroup.slug}"
                />
                <span class="own-check__visual" data-own-accent={openPaletteIndex}></span>
              </label>

              <button
                type="button"
                class="own-unit__trigger"
                onclick={() => toggleUnitOpen(uid)}
                aria-expanded={isOpen}
              >
                <span class="min-w-0 flex-1 text-left">
                  {unit.chapterGroup.name?.en ?? unit.chapterGroup.slug}
                </span>

                <span class="own-unit__count">
                  {selCh}/{totalCh}
                </span>

                <span class="own-unit__chev" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
            </div>

            {#if isOpen}
              <div class="own-unit__body">
                <ul class="mt-3 flex flex-col gap-2">
                  {#each unit.data as ch (ch._id)}
                    <li>
                      <div class="own-chapter-row w-full">
                        <label class="own-check">
                          <input
                            type="checkbox"
                            checked={checkedChapters.has(ch._id)}
                            onchange={() => toggleChapterCheck(ch._id, unit)}
                            aria-label="Select chapter {ch.name?.en ?? ch.slug}"
                          />
                          <span class="own-check__visual" data-own-accent={openPaletteIndex}></span>
                        </label>
                        <span class="own-chapter__label">{ch.name?.en ?? ch.slug}</span>
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
      <p class="text-sm own-muted-text">Select a subject to view units.</p>
    {/if}
  </div>
  </div>

  <footer class="own-bottom-bar" aria-label="Selection summary">
    <div class="own-bottom-bar__subject">
      <span class="own-bottom-bar__label">Selected subjects</span>
      {#if selectedSubjectsForBar.length > 0}
        <ul class="own-bottom-bar__list" role="list">
          {#each selectedSubjectsForBar as s (s.id)}
            <li class="own-bottom-bar__item">
              <span class="own-selected-strip__tag" data-own-accent={s.accent}>{s.name}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <span class="own-bottom-bar__empty">None selected</span>
      {/if}
    </div>
    <button
      type="button"
      class="own-bottom-bar__next"
      disabled={selectedSubjectsForBar.length === 0}
      onclick={handleNextClick}
    >
      Next
    </button>
  </footer>
</div>
