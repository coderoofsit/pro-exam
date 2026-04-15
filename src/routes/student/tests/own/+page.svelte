<script lang="ts">
  import ExamPaper from '$lib/components/ExamPaper.svelte';
  import CustomeModal from '$lib/components/customeModal.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const exams = $derived(data.exams ?? []);
  const error = $derived(data.error ?? null);

  /** `?mode=manual|random` — no persistence; back to bare /student/tests/own shows the modal again */
  const creationMode = $derived.by(() => {
    const m = page.url.searchParams.get('mode');
    return m === 'manual' || m === 'random' ? m : null;
  });

  const showChoiceModal = $derived(Boolean(!error && creationMode === null));

  function onSelect(mode: 'manual' | 'random') {
    goto(`/student/tests/own?mode=${mode}`, { noScroll: true });
  }

  function onBack() {
    goto('/student/tests');
  }
</script>

<svelte:head>
  <title>Create your own test — Exam Abhyas</title>
</svelte:head>

<div class="own-test-page min-h-full font-sans transition-colors duration-300">
  <div class="mx-auto  px-4 py-8 ">
    <CustomeModal
      open={showChoiceModal}
      dismissible={false}
      examName="Create your own test"
      onBack={onBack}
      onSelect={onSelect}
    />

    {#if !showChoiceModal}
      {#if error}
        <div
          class="
        flex items-center gap-3 rounded-2xl px-5 py-4
        bg-[var(--pc-error-bg)]
        border border-[var(--pc-error-border)]
        text-sm text-[var(--pc-error-text)]
      "
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          {error}
        </div>
      {:else if exams.length === 0}
        <div
          class="
        flex flex-col items-center justify-center
        rounded-2xl px-6 py-16 text-center
        bg-[var(--sh-exam-card-bg)]
        border border-[var(--sh-exam-card-border)]
      "
        >
          <span
            class="
          flex h-14 w-14 items-center justify-center rounded-2xl mb-4
          bg-[var(--sh-exam-card-arrow-bg)]
          text-[var(--sh-exam-card-arrow-color)]
        "
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
              />
              <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75" />
              <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          </span>
          <p class="text-sm font-semibold text-[var(--sh-section-title)]">No exams available</p>
          <p class="mt-1 text-xs text-[var(--sh-ai-sub)]">Check back later to create a test</p>
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {#each exams as item (item._id)}
            <ExamPaper
              id={item._id}
              name={item?.name?.en ?? 'Unnamed'}
              image={item?.image ?? null}
              slug={item?.slug ?? ''}
              href={'/student/tests/own/' +
                (item?.slug ?? '') +
                (creationMode ? `?mode=${creationMode}` : '')}
            />
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>
