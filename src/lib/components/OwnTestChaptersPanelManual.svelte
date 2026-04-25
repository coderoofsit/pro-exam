<script lang="ts">
  import type { GroupedSubjectRow, GroupedChapterGroupRow } from '$lib/api/chapters';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';

  type Props = {
    groupedSubjects: GroupedSubjectRow[];
    examSlug: string;
    examId: string;
    boardId: string;
  };

  let { groupedSubjects, examSlug, examId, boardId }: Props = $props();

  let openSubjectSlug = $state<string>('');
  let openUnitIds = $state<Set<string>>(new Set());
  let subjectRailOpen = $state(true);
  let manualSelectedRows = $state<Array<{ id: string; chapterId: string }>>([]);
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
        manualSelectedRows = ids.map((id) => ({ id, chapterId: '' }));
        return;
      }

      const rows = (parsed as any[])
        .map((r) => ({ id: String(r?.id ?? ''), chapterId: String(r?.chapterId ?? '') }))
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
      openUnitIds = new Set(unitIdsFromQuery);
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
  const next = new Set(openUnitIds);
  if (next.has(unitId)) next.delete(unitId);
  else next.add(unitId);
  openUnitIds = next;
}

  function chapterHref(chSlug: string, topicSlug?: string) {
    const q = new URLSearchParams({ mode: 'manual', examId, boardId, subject: openSubjectSlug });
    if (openUnitIds.size > 0) q.set('units', Array.from(openUnitIds).join(','));
    if (topicSlug) q.set('topic', topicSlug);
    return `/student/tests/own/${encodeURIComponent(examSlug)}/chapter/${encodeURIComponent(chSlug)}?${q}`;
  }

  async function openChapter(chSlug: string, topicSlug: string, topicId: string) {
    if (openingChapterId) return;
    openingChapterId = topicId;
    try {
      await goto(chapterHref(chSlug, topicSlug));
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

          <div class="own-unit" class:own-unit--open={isOpen}>
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
                    <li>
                      <button
                        type="button"
                        class="own-chapter-row own-chapter-row--manual w-full cursor-pointer text-left"
                        disabled={openingChapterId !== null}
                        aria-busy={openingChapterId === ch._id}
                        onclick={() => void openChapter(unit.chapterGroup.slug, ch.slug, ch._id)}
                      >
                        <span class="own-chapter__label">{ch.name?.en ?? ch.slug}</span>
                        <span class="own-chapter__next" aria-hidden="true">
                          {#if openingChapterId === ch._id}
                            <span class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
                          {:else}
                            <span aria-hidden="true">→</span>
                          {/if}
                        </span>
                      </button>
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
