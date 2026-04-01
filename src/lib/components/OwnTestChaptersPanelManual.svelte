<script lang="ts">
  import type { GroupedSubjectRow, GroupedChapterGroupRow } from '$lib/api/chapters';
  import { browser } from '$app/environment';

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

  const manualSelectionKey = $derived(`own-manual-selected::${examSlug}`);
  const manualUiStateKey = $derived(`own-manual-ui::${examSlug}`);
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

  

  $effect(() => {
  if (!browser) return;
  if (!groupedSubjects.length) return;

  try {
    const raw = sessionStorage.getItem(manualUiStateKey);

    if (raw) {
      const parsed = JSON.parse(raw) as {
        openSubjectSlug?: string;
        openUnitIds?: string[];
      };

      const validSubjectSlugs = new Set(groupedSubjects.map((g) => g.subject.slug));
      const validUnitIds = new Set(
        groupedSubjects.flatMap((g) => (g.data ?? []).map((u) => String(u.chapterGroup._id)))
      );

      const savedSubject =
        typeof parsed?.openSubjectSlug === 'string' &&
        validSubjectSlugs.has(parsed.openSubjectSlug)
          ? parsed.openSubjectSlug
          : '';

      const savedUnits = Array.isArray(parsed?.openUnitIds)
        ? parsed.openUnitIds
            .map((id) => String(id))
            .filter((id) => validUnitIds.has(id))
        : [];

      openSubjectSlug = savedSubject || groupedSubjects[0]?.subject?.slug || '';
      openUnitIds = new Set(savedUnits);
      return;
    }
  } catch {}

  openSubjectSlug = groupedSubjects[0]?.subject?.slug || '';
  openUnitIds = new Set();
});

$effect(() => {
  if (!browser) return;
  if (!groupedSubjects.length) return;

  try {
    sessionStorage.setItem(
      manualUiStateKey,
      JSON.stringify({
        openSubjectSlug,
        openUnitIds: Array.from(openUnitIds)
      })
    );
  } catch {}
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
    openUnitIds = new Set();
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

  function chapterHref(chSlug: string) {
    const q = new URLSearchParams({ mode: 'manual', examId, boardId });
    return `/student/tests/own/${encodeURIComponent(examSlug)}/chapter/${encodeURIComponent(chSlug)}?${q}`;
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
              {n} unit{n === 1 ? '' : 's'}
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

                <span class="own-unit__count">
                  {totalCh} ch.
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
                    <li>
                      <div class="own-chapter-row own-chapter-row--manual w-full">
                        <span class="own-chapter__label">{ch.name?.en ?? ch.slug}</span>
                        {#if qCount > 0}
                          <span class="text-xs text-[var(--own-muted)] mr-2">{qCount} q.</span>
                        {/if}
                        <a
                          class="own-chapter__next"
                          href={chapterHref(ch.slug)}
                          aria-label="Open chapter {ch.name?.en ?? ch.slug}"
                        >
                          <span aria-hidden="true">→</span>
                        </a>
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
</div>
