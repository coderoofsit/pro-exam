<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';

  /** UTC ISO string → calendar date in Asia/Kolkata (date only). */
  function expiryUtcToIstDate(iso: string | null | undefined) {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '';
    return new Date(t).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function goToPlans() {
    void goto('/student/subscription/plans');
  }

  const defaultProfile = $derived(
    $authStore.users.find((u) => u.defaultProfile) ?? $authStore.users[0] ?? null
  );
  const sub = $derived(defaultProfile?.subscription ?? null);
</script>

<svelte:head>
  <title>Subscription — ExamFlow</title>
</svelte:head>

<div class="relative mx-auto max-w-5xl px-4 pb-36 pt-2 sm:px-5 sm:pb-10">
  <header class="mb-10 text-center sm:mb-14">
    <p
      class="mb-3 inline-flex items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_45%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sh-ai-sub)]"
    >
      ExamFlow for students
    </p>
    <h1 class="text-3xl font-bold tracking-tight text-[var(--sh-section-title)] sm:text-4xl">
      Go beyond limits — practise without ceilings
    </h1>
    <p class="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--sh-ai-sub)] sm:text-lg">
      Unlock the full test library, smarter analytics, and priority support. Whether you’re preparing for one exam or a
      season of mocks, Pro keeps you in flow.
    </p>
  </header>

  {#if defaultProfile}
    <section
      class="mb-10 rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 sm:p-6"
      aria-labelledby="sub-status-heading"
    >
      <h2 id="sub-status-heading" class="text-sm font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
        Your profile
      </h2>
      <p class="mt-1 text-base font-semibold text-[var(--sh-section-title)]">
        {defaultProfile.firstName}
        {defaultProfile.lastName}
      </p>
      {#if sub}
        <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-[var(--sh-ai-sub)]">Status</dt>
            <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
              {#if !sub.isSubscribed}
                No active subscription
              {:else if sub.isTrial}
                Active — TRAIL
              {:else}
                Active — PAID
              {/if}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-[var(--sh-ai-sub)]">Free trial</dt>
            <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
              {sub.trialUsed ? 'Already used' : 'Available'}
            </dd>
          </div>
          {#if sub.expiry}
            <div class="sm:col-span-2">
              <dt class="text-xs text-[var(--sh-ai-sub)]">Expires</dt>
              <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
                {expiryUtcToIstDate(sub.expiry)}
              </dd>
            </div>
          {/if}
        </dl>
      {:else}
        <p class="mt-3 text-sm text-[var(--sh-ai-sub)]">Subscription details will appear here once loaded.</p>
      {/if}
    </section>
  {/if}

  <div class="mb-10 grid gap-4 sm:grid-cols-3">
    <div
      class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)]"
    >
      <div
        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent-cta-pink)_20%,transparent)] text-[var(--accent-cta-pink)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2 class="font-semibold text-[var(--sh-section-title)]">Unlimited tests</h2>
      <p class="mt-1.5 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
        Run as many practice sets and full mocks as you need — no daily caps holding you back.
      </p>
    </div>
    <div
      class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)]"
    >
      <div
        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent-cta-cyan)_22%,transparent)] text-[var(--accent-cta-cyan)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <h2 class="font-semibold text-[var(--sh-section-title)]">Smarter pacing</h2>
      <p class="mt-1.5 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
        Timers, attempts, and history in one place — so you can see what to fix next.
      </p>
    </div>
    <div
      class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)]"
    >
      <div
        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--pc-success-bg)_60%,transparent)] text-[var(--pc-success-text)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2 class="font-semibold text-[var(--sh-section-title)]">Made for your batch</h2>
      <p class="mt-1.5 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
        Join institute batches and custom tests without friction — one subscription, your whole prep stack.
      </p>
    </div>
  </div>

  <section
    class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_55%,transparent)_0%,var(--sh-exam-card-bg)_100%)] p-6 sm:p-8"
  >
    <h2 class="text-lg font-bold text-[var(--sh-section-title)] sm:text-xl">Why upgrade now?</h2>
    <ul class="mt-4 space-y-3 text-sm leading-relaxed text-[var(--sh-ai-sub)] sm:text-base">
      <li class="flex gap-3">
        <span class="text-[var(--accent-cta-pink)]" aria-hidden="true">✓</span>
        <span>Compare your attempts over time and spot weak topics before exam day.</span>
      </li>
      <li class="flex gap-3">
        <span class="text-[var(--accent-cta-pink)]" aria-hidden="true">✓</span>
        <span>Priority access to new question banks and PYQ-style papers as we add them.</span>
      </li>
      <li class="flex gap-3">
        <span class="text-[var(--accent-cta-pink)]" aria-hidden="true">✓</span>
        <span>Support that answers faster when you’re stuck — so you’re never blocked mid-session.</span>
      </li>
    </ul>
  </section>
</div>

<div
  class="pointer-events-none fixed bottom-0 left-0 right-0 z-[50] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:left-[var(--sb-width-expanded)]"
  role="region"
  aria-label="Upgrade subscription"
>
  <div
    class="subscription-bottom-bar pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-[var(--sh-exam-card-border)] px-4 py-3 shadow-[0_-4px_28px_rgba(0,0,0,0.1)] backdrop-blur-sm sm:px-5"
  >
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-[var(--sh-section-title)] sm:text-base">
        Ready to level up your prep?
      </p>
      <p class="mt-0.5 text-xs leading-snug text-[var(--sh-ai-sub)] sm:text-sm">
        See transparent pricing and pick a plan — trial or full Pro, you’re in control.
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 cursor-pointer rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[var(--sh-exam-card-hover-border)] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_78%,var(--accent-cta-pink))] active:scale-[0.99] sm:px-5"
      onclick={goToPlans}
    >
      Upgrade
    </button>
  </div>
</div>

<style>
  .subscription-bottom-bar {
    background: color-mix(in srgb, var(--sh-exam-card-bg) 96%, var(--sh-exam-card-arrow-bg));
  }
  :global([data-theme='dark']) .subscription-bottom-bar {
    background: color-mix(in srgb, var(--sh-exam-card-bg) 55%, rgba(255, 255, 255, 0.1));
  }
</style>
