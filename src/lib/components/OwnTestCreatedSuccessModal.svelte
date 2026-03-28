<script lang="ts">
  type Props = {
    open: boolean;
    examName?: string;
    starting?: boolean;
    startError?: string | null;
    onDoLater: () => void;
    onStartTest: () => void;
  };

  let {
    open,
    examName = '',
    starting = false,
    startError = null,
    onDoLater,
    onStartTest
  }: Props = $props();
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="own-success-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="own-success-modal-title">
    <div class="own-success-modal-sheet">
      <div class="own-success-modal-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.35" />
          <path
            d="M8 12.5l2.5 2.5L16 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2 id="own-success-modal-title" class="own-success-modal-title">Test created</h2>
      <p class="own-success-modal-sub">
        {#if examName}
          Your custom test for <strong>{examName}</strong> is ready when you are.
        {:else}
          Your custom test is ready when you are.
        {/if}
      </p>
      {#if startError}
        <p class="mt-3 rounded-lg border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-xs text-[var(--pc-error-text)]" role="alert">
          {startError}
        </p>
      {/if}
      <div class="own-success-modal-actions">
        <button
          type="button"
          class="own-q-modal-btn own-q-modal-btn--ghost"
          onclick={onDoLater}
          disabled={starting}
        >
          Do it later
        </button>
        <button
          type="button"
          class="btn-cta-subscription-outline min-w-[8.5rem] justify-center"
          onclick={onStartTest}
          disabled={starting}
        >
          {#if starting}
            <span
              class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            ></span>
            Starting…
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="opacity-80" aria-hidden="true">
              <path d="M8 5v14l11-7-11-7z" fill="currentColor" />
            </svg>
            Start Test
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
