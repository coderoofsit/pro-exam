<script lang="ts">
  type Props = {
    id: string;
    name: string;
    image: string | null;
    slug: string;
    yearRange?: string;  
    href: string;
  };

  let { id, name, image, slug, yearRange, href }: Props = $props();
  function handleImgError(e: Event) {
    (e.currentTarget as HTMLImageElement).style.display = 'none';
  }

  function initials(n: string) {
    return n
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }
</script>

<a
  {href}
  class="
    group flex flex-col items-center justify-center gap-1.5
    rounded-xl px-3 py-3 w-full min-h-[118px] overflow-hidden text-center
    border border-[color-mix(in_srgb,var(--accent-cta-pink)_26%,var(--sh-exam-card-border))]
    bg-[var(--sh-exam-card-bg)]
    shadow-[0_1px_2px_rgba(15,23,42,0.06)]
    transition-all duration-200 no-underline
    hover:border-[var(--accent-cta-pink)]
    hover:bg-[color-mix(in_srgb,var(--sh-exam-card-border)_18%,var(--sh-exam-card-bg))]
    hover:shadow-[0_6px_18px_-8px_rgba(0,0,0,0.2)]
    hover:-translate-y-0.5
  "
>
  <div class="
    flex-shrink-0 h-9 w-9 rounded-full overflow-hidden
    bg-[var(--sh-exam-card-arrow-bg)]
    ring-1 ring-[var(--sh-exam-card-border)]
    flex items-center justify-center
  ">
    {#if image}
      <img
        src={image}
        alt={name}
        class="h-full w-full object-contain"
        onerror={handleImgError}
      />
    {/if}
    <span class="
      text-[10px] font-bold text-[var(--sh-exam-card-arrow-color)]
      {image ? 'hidden' : ''}
    ">
      {initials(name)}
    </span>
  </div>
  <p class="line-clamp-2 w-full text-[13px] font-semibold leading-tight text-[var(--sh-exam-card-title)] group-hover:text-[var(--accent-cta-pink)]">
    {name}
  </p>
  {#if yearRange}
    <p class="text-[11px] text-[var(--sh-ai-sub)] font-medium">{yearRange}</p>
  {/if}
</a>