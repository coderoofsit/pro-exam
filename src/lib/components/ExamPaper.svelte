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
    group relative flex flex-col justify-between
    rounded-2xl p-4 min-h-[120px] overflow-hidden
    bg-[var(--sh-exam-card-bg)]
    border border-[var(--sh-exam-card-border)]
    transition-all duration-200 no-underline
    hover:border-[var(--sh-exam-card-hover-border)]
    hover:shadow-[var(--sh-exam-card-hover-shadow)]
    hover:-translate-y-0.5
  "
>
  <span class="
    absolute top-3 right-3
    flex h-7 w-7 items-center justify-center rounded-full
    bg-[var(--sh-exam-card-arrow-bg)]
    text-[var(--sh-exam-card-arrow-color)]
    transition-colors duration-150
    group-hover:bg-[var(--sh-exam-card-arrow-hover-bg)]
  ">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M7 17L17 7M17 7H7M17 7v10"
        stroke="currentColor" stroke-width="2.2"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>

  <div class="flex items-center gap-2.5 pr-8">
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
    <p class="text-sm font-semibold text-[var(--sh-exam-card-title)] leading-snug line-clamp-2">
      {name}
    </p>
  </div>
  {#if yearRange}
    <p class="mt-3 text-xs text-[var(--sh-ai-sub)] font-medium">
      {yearRange}
    </p>
  {/if}
</a>