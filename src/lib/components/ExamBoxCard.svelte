<script lang="ts">
  type Props = {
    id?: string;
    name: string;
    image?: string | null;
    href: string;
    loading?: boolean;
    onNavigate?: (e: MouseEvent) => void;
    subtitle?: string;
    variant?: 'default' | 'dashboard';
  };

  let {
    id: _id = undefined,
    name,
    image = null,
    href,
    loading = false,
    onNavigate,
    subtitle,
    variant = 'dashboard'
  }: Props = $props();

  function onImgError(e: Event) {
    (e.currentTarget as HTMLImageElement).style.display = 'none';
  }

  function initials(label: string) {
    const out = label
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
    return out || 'EX';
  }
</script>

<a
  {href}
  onclick={onNavigate}
  aria-busy={loading}
  aria-disabled={loading}
  class={`group exam-box-card exam-box-card--${variant} ${loading ? 'is-loading' : ''}`}
>
  <div class="exam-box-card__icon" aria-hidden="true">
    {#if image}
      <img src={image} alt="" class="h-full w-full object-cover" loading="lazy" onerror={onImgError} />
    {:else}
      <span>{initials(name)}</span>
    {/if}
  </div>

  <div class="exam-box-card__text">
    <p class="exam-box-card__title" title={name}>
      {name}
    </p>
    {#if subtitle}
      <p class="exam-box-card__subtitle" title={subtitle}>
        {subtitle}
      </p>
    {/if}
  </div>

  {#if loading}
    <span class="exam-box-card__loading">Loading...</span>
  {/if}
</a>
