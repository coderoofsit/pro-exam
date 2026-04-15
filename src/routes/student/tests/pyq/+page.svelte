<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const exams = data.exams ?? [];
  const error = data.error ?? null;

  function examName(item: any): string {
    return item?.name?.en ?? 'Unnamed';
  }
  function examInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  }
</script>

<svelte:head>
  <title>Chapter wise PYQ — Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto px-4 py-8 ">
    <!-- Error state -->
    {#if error}
      <div class="
        flex items-center gap-3 rounded-2xl px-5 py-4
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-sm text-[var(--pc-error-text)]
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        {error}
      </div>

    <!-- Empty state -->
    {:else if exams.length === 0}
      <div class="
        flex flex-col items-center justify-center
        rounded-2xl px-6 py-16 text-center
        bg-[var(--sh-exam-card-bg)]
        border border-[var(--sh-exam-card-border)]
      ">
        <span class="
          flex h-14 w-14 items-center justify-center rounded-2xl mb-4
          bg-[var(--sh-exam-card-arrow-bg)]
          text-[var(--sh-exam-card-arrow-color)]
        ">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/>
            <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
          </svg>
        </span>
        <p class="text-sm font-semibold text-[var(--sh-section-title)]">No exams available</p>
        <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">Check back later for PYQ content</p>
      </div>
    {:else}
      <div class="flex flex-wrap gap-3">
        {#each exams as item (item._id)}
          <a
            href={"/student/tests/pyq/" + (item?.slug ?? '')}
            class="group relative flex flex-col items-center justify-center gap-3 rounded-2xl p-4 w-[260px] min-h-[120px] overflow-hidden no-underline
              border border-[color-mix(in_srgb,var(--accent-cta-pink)_26%,var(--sh-exam-card-border))]
              bg-[var(--sh-exam-card-bg)]
              shadow-[0_1px_2px_rgba(15,23,42,0.06)]
              transition-all duration-200
              hover:border-[var(--accent-cta-pink)]
              hover:bg-[color-mix(in_srgb,var(--sh-exam-card-border)_18%,var(--sh-exam-card-bg))]
              hover:-translate-y-0.5"
          >
            <span class="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-arrow-bg)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="text-[var(--accent-cta-pink)]" aria-hidden="true">
                <path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sh-exam-card-arrow-bg)] ring-2 ring-[var(--sh-exam-card-border)]">
              {#if item?.image}
                <img src={item.image} alt={examName(item)} class="h-full w-full rounded-full object-contain" />
              {:else}
                <span class="text-sm font-bold text-[var(--sh-exam-card-arrow-color)]">{examInitials(examName(item))}</span>
              {/if}
            </div>
            <p class="text-center text-[13px] font-bold leading-tight tracking-wide line-clamp-2 text-[var(--sh-exam-card-title)] group-hover:text-[var(--accent-cta-pink)] transition-colors">
              {examName(item)}
            </p>
          </a>
        {/each}
      </div>
    {/if}

  </div>
</div>
