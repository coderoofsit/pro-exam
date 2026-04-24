<script lang="ts">
  import { browser } from '$app/environment';

  type Props = {
    label: string;
    onClick?: (e: MouseEvent) => void;
    className?: string;
    tone?: 'default' | 'pyq';
    type?: 'button' | 'submit' | 'reset';
  };

  let {
    label,
    onClick,
    className = '',
    tone = 'default',
    type = 'button'
  }: Props = $props();

  const toneClass = $derived(tone === 'pyq' ? 'exam-route-back-btn--pyq' : '');

  function handleClick(e: MouseEvent) {
    if (onClick) {
      onClick(e);
      return;
    }

    if (!browser) return;

    e.preventDefault();
    window.history.back();
  }
</script>

<button type={type} onclick={handleClick} class={`exam-route-back-btn ${toneClass} ${className}`}>
  <svg class="exam-route-back-btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <span>{label}</span>
</button>
