<script lang="ts">
  import { browser } from "$app/environment";

  let { src, onClose }: { src: string | null; onClose: () => void } = $props();

  $effect(() => {
    if (!browser || !src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
</script>

{#if src}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-label="Enlarged image"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && onClose()}
    onkeydown={(e) => e.key === "Escape" && onClose()}
  >
    <button
      type="button"
      class="
        absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center
        rounded-full border border-white/20 bg-white/10 text-white
        transition hover:bg-white/20
      "
      onclick={onClose}
      aria-label="Close"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <img
      {src}
      alt=""
      class="max-h-[min(90vh,900px)] max-w-full object-contain"
    />
  </div>
{/if}
