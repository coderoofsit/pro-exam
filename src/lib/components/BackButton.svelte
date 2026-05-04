<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  type Props = {
    label: string;
    onClick?: (e: MouseEvent) => void;
    className?: string;
    tone?: 'default' | 'pyq';
    type?: 'button' | 'submit' | 'reset';
    fallback?: string;
    historyDelta?: number;
    useHistory?: boolean;
  };

  let {
    label,
    onClick,
    className = '',
    tone = 'default',
    type = 'button',
    fallback = '/',
    historyDelta = -1,
    useHistory = true
  }: Props = $props();

  const toneClass = $derived(tone === 'pyq' ? 'exam-route-back-btn--pyq' : '');

  function handleClick(e: MouseEvent) {
    if (!browser) return;

    if (useHistory && window.history.length > 1) {
      window.history.go(historyDelta);
      return;
    }

    if (onClick) {
      onClick(e);
    } else {
      goto(fallback);
    }
  }
</script>

<button
  type={type}
  onclick={handleClick}
  class={`exam-route-back-btn ${toneClass} ${className}`.trim()}
  aria-label={label}
>
  <svg
    class="exam-route-back-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M15 18l-6-6 6-6"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>

  <span class="!hidden sm:!inline-flex">{label}</span>
</button>