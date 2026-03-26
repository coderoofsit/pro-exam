<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import StudentBatchCard from '$lib/components/StudentBatchCard.svelte';
  import { debounce } from '$lib/utils/debounce';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let searchInput = $state(data.search ?? '');

  $effect(() => {
    searchInput = data.search ?? '';
  });

  /** First visit may have JWT in localStorage but not the mirrored cookie yet — sync then rerun `load`. */
  onMount(() => {
    if (!data.ssrAuthMissing || typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(AUTH_STORAGE_KEY)?.trim()) return;
    authStore.restore();
    void invalidateAll();
  });

  const debouncedSearchNavigate = debounce((raw: string) => {
    const u = new URL(page.url);
    const t = raw.trim();
    if (t) u.searchParams.set('search', t);
    else u.searchParams.delete('search');
    u.searchParams.set('page', '1');
    goto(`${u.pathname}${u.search}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }, 400);

  function onSearchInput(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value;
    searchInput = v;
    debouncedSearchNavigate(v);
  }

  function hrefForPage(p: number): string {
    const u = new URL(page.url);
    u.searchParams.set('page', String(p));
    return `${u.pathname}${u.search}`;
  }

  const batches = $derived(data.batches ?? []);
  const error = $derived(data.error ?? null);
  const lastPage = $derived(data.lastPage ?? 1);
  const currentPage = $derived(data.currentPage ?? 1);
  const total = $derived(data.total ?? 0);
  const showPagination = $derived(lastPage > 1);
</script>

<svelte:head>
  <title>Batches — ExamFlow</title>
</svelte:head>

<div class="min-h-full bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-5xl px-4 py-8">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   

      <label class="w-full max-w-sm sm:max-w-xs">
        <span class="sr-only">Search batches</span>
        <input
          type="search"
          autocomplete="off"
          placeholder="Search batches…"
          class="
            w-full rounded-xl border px-3 py-2.5 text-sm
            border-[var(--sh-exam-card-border)]
            bg-[var(--sh-exam-card-bg)]
            text-[var(--sh-exam-card-title)]
            placeholder:text-[var(--sh-ai-sub)]
            outline-none transition-colors
            focus:border-[var(--sh-exam-card-hover-border)]
            focus:ring-1 focus:ring-[color-mix(in_srgb,var(--sh-exam-card-hover-border)_40%,transparent)]
          "
          value={searchInput}
          oninput={onSearchInput}
        />
      </label>
    </header>

    {#if error}
      <div
        class="
          flex items-center gap-3 rounded-2xl px-5 py-4 text-sm
          bg-[var(--pc-error-bg)]
          border border-[var(--pc-error-border)]
          text-[var(--pc-error-text)]
        "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        {error}
      </div>
    {:else if batches.length === 0}
      <div
        class="
          flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center
          border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
        "
      >
        <span
          class="
            mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
            bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)]
          "
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h16M4 12h10M4 18h16"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <p class="text-sm font-semibold text-[var(--sh-section-title)]">No batches found</p>
        <p class="mt-1 max-w-sm text-xs text-[var(--sh-ai-sub)]">
          Try another search or check back when your institute assigns you to a batch.
        </p>
      </div>
    {:else}
      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {#each batches as batch (batch._id)}
          <li>
            <StudentBatchCard {batch} />
          </li>
        {/each}
      </ul>

      {#if showPagination}
        <nav
          class="mt-8 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--sh-exam-card-border)] pt-6"
          aria-label="Pagination"
        >
          {#if currentPage > 1}
            <a
              class="
                inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm font-medium
                border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                text-[var(--sh-exam-card-title)] no-underline
                transition-colors hover:border-[var(--sh-exam-card-hover-border)]
              "
              href={hrefForPage(currentPage - 1)}>Previous</a
            >
          {:else}
            <span
              class="
                inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-lg border px-3 text-sm font-medium
                border-[var(--sh-exam-card-border)] opacity-50
                text-[var(--sh-ai-sub)]
              ">Previous</span
            >
          {/if}

          <span class="px-2 text-sm text-[var(--sh-ai-sub)]">
            Page <span class="font-medium text-[var(--sh-exam-card-title)]">{currentPage}</span>
            of
            <span class="font-medium text-[var(--sh-exam-card-title)]">{lastPage}</span>
          </span>

          {#if currentPage < lastPage}
            <a
              class="
                inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm font-medium
                border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]
                text-[var(--sh-exam-card-title)] no-underline
                transition-colors hover:border-[var(--sh-exam-card-hover-border)]
              "
              href={hrefForPage(currentPage + 1)}>Next</a
            >
          {:else}
            <span
              class="
                inline-flex min-h-[2.5rem] min-w-[2.5rem] cursor-not-allowed items-center justify-center rounded-lg border px-3 text-sm font-medium
                border-[var(--sh-exam-card-border)] opacity-50
                text-[var(--sh-ai-sub)]
              ">Next</span
            >
          {/if}
        </nav>
      {/if}
    {/if}
  </div>
</div>
