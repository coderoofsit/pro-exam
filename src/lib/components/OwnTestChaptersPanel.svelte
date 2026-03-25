<script lang="ts">
  import type { GroupedSubjectRow } from '$lib/api/chapters';

  type Props = {
    groupedSubjects: GroupedSubjectRow[];
    examSlug: string;
  };

  let { groupedSubjects, examSlug }: Props = $props();

  let selectedSubjectSlug = $state('');
  let openUnitIds = $state<Set<string>>(new Set());

  $effect(() => {
    const first = groupedSubjects[0]?.subject?.slug;
    if (!first) return;
    if (!selectedSubjectSlug || !groupedSubjects.some((g) => g.subject.slug === selectedSubjectSlug)) {
      selectedSubjectSlug = first;
    }
  });

  const selectedSubject = $derived(
    groupedSubjects.find((g) => g.subject.slug === selectedSubjectSlug) ?? null
  );

  /** Matches subject card accent so units/chapters use the same palette (0–3). */
  const selectedPaletteIndex = $derived.by(() => {
    const idx = groupedSubjects.findIndex((g) => g.subject.slug === selectedSubjectSlug);
    return idx >= 0 ? idx % 4 : 0;
  });

  function unitCount(row: GroupedSubjectRow) {
    return row.data?.length ?? 0;
  }

  function selectSubject(slug: string) {
    selectedSubjectSlug = slug;
    openUnitIds = new Set();
  }

  function toggleUnit(unitId: string) {
    const next = new Set(openUnitIds);
    if (next.has(unitId)) next.delete(unitId);
    else next.add(unitId);
    openUnitIds = next;
  }

  function examTitleFromSlug(slug: string) {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
</script>

<div class="own-test-chapters-root flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
  <aside
    class="own-test-subject-rail flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-0 lg:z-10 lg:w-[260px] lg:self-start lg:max-h-[calc(100dvh-7rem)] lg:overflow-hidden"
    aria-label="Subjects"
  >
  <div></div>
    {#each groupedSubjects as row, i (row.subject._id)}
      {@const accentIdx = i % 4}
      {@const selected = selectedSubjectSlug === row.subject.slug}
      {@const n = unitCount(row)}
      <button
        type="button"
        class="own-subject-card"
        class:own-subject-card--selected={selected}
        data-own-accent={accentIdx}
        onclick={() => selectSubject(row.subject.slug)}
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="own-subject-card__title">{row.subject.name?.en ?? row.subject.slug}</p>
            <p class="own-subject-card__meta">{n} unit{n === 1 ? '' : 's'}</p>
          </div>
          <span class="own-subject-card__arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-90">
              <path
                d="M7 17L17 7M17 7H7M17 7v10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>
    {/each}
  </aside>

  <div class="min-w-0 flex-1 lg:min-h-[min(60vh,480px)]">
    <div class="mb-4 lg:hidden">
      <h2 class="own-section-label">Units & chapters</h2>
    </div>

    {#if selectedSubject}
      <div class="own-units flex flex-col gap-3" data-own-palette={selectedPaletteIndex}>
        {#each selectedSubject.data as unit (unit.chapterGroup._id)}
          {@const uid = unit.chapterGroup._id}
          {@const isOpen = openUnitIds.has(uid)}
          <div class="own-unit" class:own-unit--open={isOpen}>
            <button
              type="button"
              class="own-unit__trigger"
              onclick={() => toggleUnit(uid)}
              aria-expanded={isOpen}
            >
              <span class="min-w-0">{unit.chapterGroup.name?.en ?? unit.chapterGroup.slug}</span>
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

            {#if isOpen}
              <div class="own-unit__body">
                <ul class="mt-3 flex flex-col gap-2">
                  {#each unit.data as ch (ch._id)}
                    <li>
                      <div class="own-chapter">
                        <span class="min-w-0 flex-1 leading-snug">{ch.name?.en ?? ch.slug}</span>
                        <span class="own-chapter__arrow" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M7 17L17 7M17 7H7M17 7v10"
                              stroke="currentColor"
                              stroke-width="2.2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </span>
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
