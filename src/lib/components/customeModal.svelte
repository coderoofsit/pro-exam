<script lang="ts">
  type Props = {
    open: boolean;
    examName?: string;
    /**
     * When false, backdrop / Escape / overlay close do nothing — user must pick Manual/Random or Back.
     */
    dismissible?: boolean;
    onClose?: () => void;
    /** Required when dismissible is false — e.g. navigate back to tests hub */
    onBack?: () => void;
    onSelect: (mode: 'manual' | 'random') => void;
  };

  let {
    open = false,
    examName = 'JEE Mains',
    dismissible = true,
    onClose,
    onBack,
    onSelect
  }: Props = $props();

  function handleBackdrop(e: MouseEvent) {
    if (!dismissible) return;
    if (e.target === e.currentTarget) onClose?.();
  }

  function handleKey(e: KeyboardEvent) {
    if (!dismissible) return;
    if (e.key === 'Escape') onClose?.();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="ctm-backdrop"
    onclick={handleBackdrop}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Create Mock Test"
  >
    <div class="ctm-sheet">

      <!-- Handle bar -->
      <div class="ctm-handle"></div>

      <!-- Header -->
      <div class="ctm-header">
        <div class="ctm-header__text">
          <p class="ctm-header__label">Create Mock Test</p>
          <h2 class="ctm-header__title">{examName}</h2>
        </div>
        {#if dismissible}
          <button type="button" class="ctm-close" onclick={() => onClose?.()} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12"
                stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        {:else}
          <button type="button" class="ctm-back" onclick={() => onBack?.()} aria-label="Go back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="ctm-back__icon">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Back</span>
          </button>
        {/if}
      </div>

      <!-- Cards -->
      <div class="ctm-cards">

        <!-- Manual -->
        <button class="ctm-card ctm-card--manual" onclick={() => onSelect('manual')}>
          <div class="ctm-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1.5"
                stroke="currentColor" stroke-width="1.8"/>
              <path d="M9 12h6M9 16h4"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="ctm-card__body">
            <p class="ctm-card__title">Manual</p>
            <p class="ctm-card__desc">Pick questions yourself, chapter by chapter</p>
          </div>
          <span class="ctm-card__arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7v10"
                stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <!-- Random -->
        <button class="ctm-card ctm-card--random" onclick={() => onSelect('random')}>
          <div class="ctm-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M3 4l6 6"
                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="ctm-card__body">
            <p class="ctm-card__title">Random</p>
            <p class="ctm-card__desc">Set question count, we'll handle the rest</p>
          </div>
          <span class="ctm-card__arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7v10"
                stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Backdrop ── */
  .ctm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: ctm-fade-in 0.18s ease;
  }

  /* ── Sheet (bottom-sheet on mobile, centered on desktop) ── */
  .ctm-sheet {
    width: 100%;
    max-width: 480px;
    border-radius: 1.5rem 1.5rem 0 0;
    padding: 0 1.25rem 2rem;
    background: var(--sh-exam-card-bg, var(--pc-card-bg, #ffffff));
    border: 1px solid
      color-mix(in srgb, var(--accent-cta-pink, #ec4899) 26%, var(--sh-exam-card-border, #e2e8f0));
    border-bottom: none;
    box-shadow: var(--pc-card-shadow, 0 -8px 48px rgba(15, 23, 42, 0.08));
    animation: ctm-slide-up 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (min-width: 540px) {
    .ctm-backdrop {
      align-items: center;
    }
    .ctm-sheet {
      border-radius: 1.5rem;
      border-bottom: 1px solid
        color-mix(in srgb, var(--accent-cta-pink, #ec4899) 26%, var(--sh-exam-card-border, #e2e8f0));
      margin-bottom: 0;
    }
    .ctm-handle { display: none; }
  }

  /* ── Handle ── */
  .ctm-handle {
    width: 2.5rem;
    height: 4px;
    border-radius: 9999px;
    background: var(--color-surface-border, #e2e8f0);
    margin: 0.75rem auto 0;
  }

  /* ── Header ── */
  .ctm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1.25rem 0 1rem;
  }
  .ctm-header__label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-content-muted, #94a3b8);
    margin: 0 0 0.2rem;
  }
  .ctm-header__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--pc-heading, #1a1f36);
    margin: 0;
    line-height: 1.2;
  }
  /* Close / Back — same chrome as ExamPaper + modal cards: pink-tint border, neutral fill, pink glyph */
  .ctm-close {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 1px solid
      color-mix(in srgb, var(--accent-cta-pink, #ec4899) 26%, var(--sh-exam-card-border, #e2e8f0));
    background: var(--sh-exam-card-bg, #ffffff);
    color: var(--accent-cta-pink, #ec4899);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s;
    margin-top: 0.1rem;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .ctm-close:hover {
    border-color: var(--accent-cta-pink, #ec4899);
    background: color-mix(
      in srgb,
      var(--sh-exam-card-border, #e2e8f0) 18%,
      var(--sh-exam-card-bg, #ffffff)
    );
    color: var(--accent-cta-pink, #ec4899);
    box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.15);
  }

  .ctm-back {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem 0.4rem 0.45rem;
    border-radius: 9999px;
    border: 1px solid
      color-mix(in srgb, var(--accent-cta-pink, #ec4899) 26%, var(--sh-exam-card-border, #e2e8f0));
    background: var(--sh-exam-card-bg, #ffffff);
    color: var(--sh-exam-card-title, var(--pc-heading, #1a1f36));
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s;
    margin-top: 0.1rem;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .ctm-back:hover {
    border-color: var(--accent-cta-pink, #ec4899);
    background: color-mix(
      in srgb,
      var(--sh-exam-card-border, #e2e8f0) 18%,
      var(--sh-exam-card-bg, #ffffff)
    );
    color: var(--sh-exam-card-title, var(--pc-heading, #1a1f36));
    box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.15);
  }
  .ctm-back__icon {
    flex-shrink: 0;
    color: var(--accent-cta-pink, #ec4899);
  }

  /* ── Cards grid ── */
  .ctm-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* ── Card base (matches ExamPaper: light pink border, neutral fill, pink on hover border) ── */
  .ctm-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    padding: 1.125rem 1.125rem;
    border-radius: 1rem;
    border: 1.5px solid
      color-mix(in srgb, var(--accent-cta-pink, #ec4899) 26%, var(--sh-exam-card-border, #e2e8f0));
    background: var(--sh-exam-card-bg, #ffffff);
    cursor: pointer;
    text-align: left;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s, background 0.2s;
  }
  .ctm-card:hover {
    border-color: var(--accent-cta-pink, #ec4899);
    background: color-mix(
      in srgb,
      var(--sh-exam-card-border, #e2e8f0) 18%,
      var(--sh-exam-card-bg, #ffffff)
    );
    box-shadow: 0 6px 18px -8px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }
  .ctm-card:active {
    transform: translateY(0);
  }

  /* ── Icon bubble (neutral surface, pink glyph — same idea as ExamPaper avatar) ── */
  .ctm-card__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.875rem;
    border: 1px solid var(--sh-exam-card-border, #e2e8f0);
    background: var(--sh-exam-card-arrow-bg, #f1f5f9);
    color: var(--accent-cta-pink, #ec4899);
    transition: background 0.2s, border-color 0.2s;
  }
  .ctm-card:hover .ctm-card__icon {
    border-color: var(--sh-exam-card-border, #e2e8f0);
    background: var(--sh-exam-card-arrow-bg, #f1f5f9);
  }

  /* ── Body text ── */
  .ctm-card__body {
    flex: 1;
    min-width: 0;
  }
  .ctm-card__title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--sh-exam-card-title, #1a1f36);
    margin: 0 0 0.2rem;
    line-height: 1.2;
  }
  .ctm-card__desc {
    font-size: 0.75rem;
    color: var(--color-content-secondary, #64748b);
    margin: 0;
    line-height: 1.4;
  }

  /* ── Arrow chip: neutral circle, pink arrow only (ExamPaper chevron) ── */
  .ctm-card__arrow {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 1px solid var(--sh-exam-card-border, #e2e8f0);
    background: var(--sh-exam-card-arrow-bg, #f1f5f9);
    color: var(--accent-cta-pink, #ec4899);
    transition: border-color 0.2s, background 0.2s;
  }
  .ctm-card:hover .ctm-card__arrow {
    border-color: var(--sh-exam-card-border, #e2e8f0);
    background: var(--sh-exam-card-arrow-bg, #f1f5f9);
    color: var(--accent-cta-pink, #ec4899);
  }

  /* ── Animations ── */
  @keyframes ctm-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes ctm-slide-up {
    from { transform: translateY(32px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>