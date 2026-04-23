<script lang="ts">
  type Props = {
    text: string;
    onClick?: () => void | Promise<void>;
    disabled?: boolean;
    className?: string;
    variant?: "default" | "highlight";
  };

  let { text, onClick, disabled = false, className = "", variant = "default" }: Props = $props();

</script>

<button
  type="button"
  class={`btn-cta-subscription-outline px-2.5 py-1 text-xs ${
    variant === "highlight"
      ? "btn-attention border-[var(--accent-cta-pink)] bg-[color-mix(in_srgb,var(--accent-cta-pink)_18%,var(--sh-exam-card-bg))] shadow-[0_8px_22px_-12px_color-mix(in_srgb,var(--accent-cta-pink)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent-cta-pink)_28%,var(--sh-exam-card-bg))] hover:shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--accent-cta-pink)_80%,transparent)]"
      : ""
  } ${className}`}
  {disabled}
  onclick={() => onClick?.()}
>
  {text}
</button>
