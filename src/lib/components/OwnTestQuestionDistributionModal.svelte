<script lang="ts">
  import type {
    OwnTestDistributionContinueData,
    OwnTestSelectionSnapshot,
    OwnTestSubjectQuestionDistribution
  } from '$lib/ownTest/questionDistribution';
  import {
    distributeQuestionsAcrossUnits,
    getMaxQuestionsForUnit
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

  let {
    open,
    snapshot,
    onClose,
    onContinue,
    submitting = false,
    errorMessage = null
  }: Props = $props();

  let totalsInput = $state<Record<string, string>>({});
  let unitInputs = $state<Record<string, Record<string, string>>>({});
  let prevOpen = $state(false);

  $effect(() => {
    const becameOpen = open && !prevOpen;
    prevOpen = open;
    if (!becameOpen || !snapshot) return;

    const nextTotals: Record<string, string> = {};
    const nextUnits: Record<string, Record<string, string>> = {};

    for (const s of snapshot.subjects) {
      nextTotals[s.subjectId] = '0';
      nextUnits[s.subjectId] = {};

      for (const unit of s.units ?? []) {
        nextUnits[s.subjectId][unit.unitId] = '0';
      }
    }

    totalsInput = nextTotals;
    unitInputs = nextUnits;
  });

  function findSubject(subjectId: string) {
    return snapshot?.subjects.find((x) => x.subjectId === subjectId) ?? null;
  }

  function clampTotal(subjectId: string, raw: string): number {
    const row = findSubject(subjectId);
    const max = row?.maxQuestions ?? 0;
    const n = parseInt(raw.trim(), 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, max);
  }

  function clampUnitRaw(_subjectId: string, _unitId: string, raw: string): number {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, getMaxQuestionsForUnit());
}

  function getUnitSum(subjectId: string): number {
    const map = unitInputs[subjectId] ?? {};
    const row = findSubject(subjectId);
    if (!row) return 0;

    let sum = 0;
    for (const u of row.units ?? []) {
      sum += clampUnitRaw(subjectId, u.unitId, map[u.unitId] ?? '0');
    }
    return sum;
  }

  function setTotal(subjectId: string, value: string) {
    totalsInput = { ...totalsInput, [subjectId]: value };

    const subject = findSubject(subjectId);
    const units = subject?.units ?? [];
    if (!subject || units.length === 0) return;

    const total = clampTotal(subjectId, value);
    const dist = distributeQuestionsAcrossUnits(total, units.length);
    const nextUnits: Record<string, string> = {};

    for (const [index, unit] of units.entries()) {
      nextUnits[unit.unitId] = String(dist[index] ?? 0);
    }

    unitInputs = {
      ...unitInputs,
      [subjectId]: nextUnits
    };
  }

  function setUnit(subjectId: string, unitId: string, value: string) {
    unitInputs = {
      ...unitInputs,
      [subjectId]: {
        ...(unitInputs[subjectId] ?? {}),
        [unitId]: value
      }
    };
  }

  function onBlurClampTotal(subjectId: string) {
    const v = clampTotal(subjectId, totalsInput[subjectId] ?? '0');
    totalsInput = { ...totalsInput, [subjectId]: String(v) };
  }

  function onBlurClampUnit(subjectId: string, unitId: string) {
    const v = clampUnitRaw(subjectId, unitId, unitInputs[subjectId]?.[unitId] ?? '0');
    unitInputs = {
      ...unitInputs,
      [subjectId]: {
        ...(unitInputs[subjectId] ?? {}),
        [unitId]: String(v)
      }
    };
  }

  function subjectIsValid(subjectId: string): boolean {
    const subject = findSubject(subjectId);
    if (!subject) return false;

    const total = clampTotal(subjectId, totalsInput[subjectId] ?? '0');
    const sum = getUnitSum(subjectId);

    return sum === total;
  }

  const hasInvalidSubjects = $derived.by(() => {
    if (!snapshot) return true;
    return snapshot.subjects.some((s) => !subjectIsValid(s.subjectId));
  });

  function handleBackdrop(e: MouseEvent) {
    if (submitting) return;
    if (e.target === e.currentTarget) onClose();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open && !submitting) onClose();
  }

  async function handleContinue() {
    if (!snapshot || hasInvalidSubjects || submitting) return;

    const totalsBySubjectId: Record<string, number> = {};
    const distributionBySubjectId: Record<string, OwnTestSubjectQuestionDistribution> = {};

    for (const subject of snapshot.subjects) {
      const total = clampTotal(subject.subjectId, totalsInput[subject.subjectId] ?? '0');

      const fixedUnits = (subject.units ?? []).map((unit) => ({
        unitId: unit.unitId,
        unitName: unit.unitName,
        questionCount: clampUnitRaw(
          subject.subjectId,
          unit.unitId,
          unitInputs[subject.subjectId]?.[unit.unitId] ?? '0'
        )
      }));

      const unitSum = fixedUnits.reduce((s, u) => s + u.questionCount, 0);
      if (unitSum !== total) return;

      totalsBySubjectId[subject.subjectId] = total;
      distributionBySubjectId[subject.subjectId] = {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        totalQuestions: total,
        units: fixedUnits
      };
    }

    const data: OwnTestDistributionContinueData = {
      subjects: snapshot.subjects.map((subject) => ({
        id: subject.subjectId,
        chapterGroup: (subject.units ?? []).map((unit) => ({
          id: unit.unitId,
          chapters: [...unit.chapterIds],
          numberOfQuestions: clampUnitRaw(
            subject.subjectId,
            unit.unitId,
            unitInputs[subject.subjectId]?.[unit.unitId] ?? '0'
          )
        }))
      }))
    };

    const payload: ContinuePayload = {
      snapshot,
      totalsBySubjectId,
      distributionBySubjectId,
      data
    };

    if (onContinue) await Promise.resolve(onContinue(payload));
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open && snapshot}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="own-q-modal-backdrop"
    onclick={handleBackdrop}
    role="dialog"
    aria-modal="true"
    aria-labelledby="own-q-modal-title"
  >
    <div class="own-q-modal-sheet">
      <div class="own-q-modal-header">
        <h2 id="own-q-modal-title" class="own-q-modal-title">Question distribution</h2>
        <p class="own-q-modal-sub">
          Set how many questions to draw per subject, then adjust the count for each selected unit.
          Continue is enabled only when the subject total matches the sum of all unit counts.
        </p>
        <button
          type="button"
          class="own-q-modal-close"
          onclick={onClose}
          disabled={submitting}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="own-q-modal-body">
        {#each snapshot.subjects as sub (sub.subjectId)}
          {@const totalQ = clampTotal(sub.subjectId, totalsInput[sub.subjectId] ?? '0')}
          {@const unitSum = getUnitSum(sub.subjectId)}
          {@const ok = subjectIsValid(sub.subjectId)}

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
                value={totalsInput[sub.subjectId] ?? '0'}
                oninput={(e) => setTotal(sub.subjectId, (e.currentTarget as HTMLInputElement).value)}
                onblur={() => onBlurClampTotal(sub.subjectId)}
              />
            </label>

            {#if (sub.units ?? []).length > 0}
              <p class="own-q-modal-units-label">Per unit</p>

              <ul class="own-q-modal-units" role="list">
                {#each sub.units ?? [] as unit (unit.unitId)}
                  <li class="own-q-modal-unit">
                    <span class="own-q-modal-unit__name">{unit.unitName}</span>

                    <input
                      type="number"
                      min="0"
                      max={getMaxQuestionsForUnit()}
                      class="own-q-modal-unit-input"
                      value={unitInputs[sub.subjectId]?.[unit.unitId] ?? '0'}
                      oninput={(e) =>
                        setUnit(sub.subjectId, unit.unitId, (e.currentTarget as HTMLInputElement).value)}
                      onblur={() => onBlurClampUnit(sub.subjectId, unit.unitId)}
                    />
                  </li>
                {/each}
              </ul>
            {/if}

            <div class="own-q-modal-summary">
              <span class:own-q-modal-summary--ok={ok} class:own-q-modal-summary--bad={!ok}>
                Unit total: {unitSum} / Subject total: {totalQ}
              </span>
            </div>
          </section>
        {/each}
      </div>

      <div class="own-q-modal-actions">
        {#if errorMessage}
          <p class="own-q-modal-error-text">{errorMessage}</p>
        {/if}
        <div class="own-q-modal-actions-row">
          <button
            type="button"
            class="own-q-modal-btn own-q-modal-btn--ghost"
            onclick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            class="own-q-modal-btn own-q-modal-btn--primary"
            onclick={() => void handleContinue()}
            disabled={hasInvalidSubjects || submitting}
          >
            {submitting ? 'Creating…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}