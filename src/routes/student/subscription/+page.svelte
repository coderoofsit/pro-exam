<script lang="ts">
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { resolveApiToken } from '$lib/api/authToken';
  import {
    fetchUserSubscription,
    fetchSubscriptionTransactions,
    patchSubscriptionAutoRenew,
    type UserSubscriptionRecord,
    type SubscriptionPeriod,
    type SubscriptionTransactionItem
  } from '$lib/api/subscription';
  import { authStore } from '$lib/stores/auth';

  let { data } = $props<{ data: { streamed: { subscription: Promise<UserSubscriptionRecord | null> } } }>();

  /** UTC ISO → calendar date in IST, e.g. 24 Aug 2026 (no time). */
  function formatUtcIsoToIstDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '—';
    return new Date(t).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatMoney(snapshot: SubscriptionPeriod['planSnapshot']): string {
    const { price, currency, isTrial } = snapshot;
    if (isTrial && price === 0) return 'Free trial';
    if (currency === 'INR') return `₹${price.toLocaleString('en-IN')}`;
    return `${currency} ${price}`;
  }

  function formatTxAmount(tx: SubscriptionTransactionItem): string {
    if (tx.currency === 'INR') return `₹${tx.amount.toLocaleString('en-IN')}`;
    return `${tx.amount} ${tx.currency}`;
  }

  function providerLabel(p: string): string {
    const s = p?.trim() || '';
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function statusLabel(status: string): string {
    const s = status?.toLowerCase() ?? '';
    if (s === 'active') return 'Active';
    if (s === 'canceled' || s === 'cancelled') return 'Canceled';
    if (s === 'expired') return 'Expired';
    return status || '—';
  }

  function goToPlans() {
    void goto('/student/subscription/plans');
  }

  const defaultProfile = $derived(
    $authStore.users.find((u) => u.defaultProfile) ?? $authStore.users[0] ?? null
  );

  let subscription = $state<UserSubscriptionRecord | null>(null);
  let loadError = $state<string | null>(null);
  let loading = $state(false);
  let autoRenewBusy = $state(false);
  let actionError = $state<string | null>(null);
  /** True when no JWT is available (user not signed in). */
  let needsAuth = $state(false);

  let transactions = $state<SubscriptionTransactionItem[]>([]);
  /** Not loading until first hover / open prefetch. */
  let transactionsLoading = $state(false);
  let transactionsError = $state<string | null>(null);
  /** True after first automatic prefetch starts (hover / first open) — avoids duplicate GETs. */
  let transactionsPrefetchStarted = $state(false);
  /** Collapsed by default; list hidden until user expands. */
  let paymentHistoryOpen = $state(false);

  async function loadTransactions() {
    if (!browser) return;
    const token = resolveApiToken();
    if (!token) {
      transactionsLoading = false;
      transactions = [];
      transactionsError = null;
      return;
    }
    transactionsLoading = true;
    transactionsError = null;
    const res = await fetchSubscriptionTransactions({ token });
    transactionsLoading = false;
    if (!res.success) {
      transactionsError = res.message || 'Could not load payment history';
      transactions = [];
      return;
    }
    const body = res.data;
    const list = Array.isArray(body?.data) ? body.data : [];
    transactions = [...list].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
  }

  /** One-shot prefetch on hover/focus so opening the panel usually shows data immediately. */
  function prefetchTransactions() {
    if (!browser) return;
    if (transactionsPrefetchStarted) return;
    const token = resolveApiToken();
    if (!token) return;
    transactionsPrefetchStarted = true;
    void loadTransactions();
  }

  function togglePaymentHistory() {
    paymentHistoryOpen = !paymentHistoryOpen;
    if (paymentHistoryOpen) prefetchTransactions();
  }

  async function refreshSubscription() {
    if (!browser) return;
    actionError = null;
    const token = resolveApiToken();
    if (!token) {
      needsAuth = true;
      return;
    }
    loading = true;
    loadError = null;
    const res = await fetchUserSubscription({ token });
    loading = false;
    if (!res.success) {
      loadError = res.message || 'Could not load subscription';
      return;
    }
    const body = res.data;
    subscription = body?.data ?? null;
  }

  async function setAutoRenew(enabled: boolean) {
    const subId = subscription?._id;
    if (!browser || autoRenewBusy || !subId) return;
    const token = resolveApiToken();
    if (!token) return;
    autoRenewBusy = true;
    actionError = null;
    const res = await patchSubscriptionAutoRenew({
      subscriptionId: subId,
      autoRenew: enabled,
      token
    });
    autoRenewBusy = false;
    if (!res.success) {
      actionError = res.message || 'Could not update auto-renew';
      return;
    }
    const payload = res.data;
    if (payload?.success === true) {
      subscription = { ...subscription!, autoRenew: enabled };
      return;
    }
    actionError = payload?.message || 'Could not update auto-renew';
  }

  $effect(() => {
    data.streamed.subscription.then((s:any) => {
      subscription = s;
    });
  });
</script>

<svelte:head>
  <title>Subscription — Exam Abhyas</title>
</svelte:head>

<div
  class="relative mx-auto max-w-5xl px-4 pt-2 pb-[max(10rem,calc(env(safe-area-inset-bottom)+9rem))] sm:px-5"
>
  <header class="mb-10 text-center sm:mb-14">
    <p
      class="mb-3 inline-flex items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_45%,transparent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sh-ai-sub)]"
    >
      Exam Abhyas for students
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
      class="mb-8 rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 sm:p-6"
      aria-labelledby="sub-profile-heading"
    >
      <h2 id="sub-profile-heading" class="text-sm font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
        Your profile
      </h2>
      <p class="mt-1 text-base font-semibold text-[var(--sh-section-title)]">
        {defaultProfile.firstName}
        {defaultProfile.lastName}
      </p>
      <p class="mt-2 text-sm text-[var(--sh-ai-sub)]">
        Subscription status below is loaded live from your account.
      </p>
    </section>
  {/if}

  <section
    class="mb-10 rounded-2xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_28%,var(--sh-exam-card-border))] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)] sm:p-6"
    aria-labelledby="sub-live-heading"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h2
        id="sub-live-heading"
        class="text-sm font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]"
      >
        Your subscription
      </h2>
      <button
        type="button"
        class="text-xs font-semibold text-[var(--accent-cta-pink)] underline-offset-2 hover:underline"
        onclick={() => void refreshSubscription()}
        disabled={loading}
      >
        Refresh
      </button>
    </div>

    {#await data.streamed.subscription}
      <div class="mt-6 space-y-4">
        <div class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5">
           <Skeleton width="w-24" height="h-4" className="mb-4" />
           <Skeleton width="w-48" height="h-8" className="mb-2" />
           <Skeleton width="w-32" height="h-4" />
           <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <Skeleton width="w-full" height="h-10" />
              <Skeleton width="w-full" height="h-10" />
           </div>
        </div>
      </div>
    {:then currentSub}
      {@const effectiveSub = subscription ?? currentSub}
      {#if loadError}
        <p class="mt-4 text-sm text-[var(--pc-error-text)]" role="alert">{loadError}</p>
        <button
          type="button"
          class="mt-3 rounded-lg border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-medium text-[var(--sh-section-title)] hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,transparent)]"
          onclick={() => void refreshSubscription()}
        >
          Try again
        </button>
      {:else if needsAuth}
        <p class="mt-4 text-sm text-[var(--sh-ai-sub)]">Sign in to see your subscription details.</p>
      {:else if !effectiveSub}
        <p class="mt-4 text-sm text-[var(--sh-ai-sub)]">
          No subscription record found. Explore plans to get started.
        </p>
        <button
          type="button"
          class="mt-4 inline-flex rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[color-mix(in_srgb,var(--accent-cta-pink)_35%,var(--sh-exam-card-hover-border))] transition-colors hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_78%,var(--accent-cta-pink))]"
          onclick={goToPlans}
        >
          View plans
        </button>
      {:else}
        <div class="mt-6 space-y-6">
          <!-- Current period -->
          <div
            class="rounded-xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_32%,var(--sh-exam-card-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-cta-pink)_12%,transparent)_0%,var(--sh-exam-card-bg)_100%)] p-4 sm:p-5"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full bg-[color-mix(in_srgb,var(--accent-cta-pink)_22%,transparent)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--accent-cta-pink)]"
              >
                Current plan
              </span>
              <span
                class="rounded-full border border-[var(--sh-exam-card-border)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--sh-section-title)]"
              >
                {statusLabel(effectiveSub.status)}
              </span>
              {#if effectiveSub.current.planSnapshot.isTrial}
                <span
                  class="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200"
                >
                  Trial
                </span>
              {/if}
            </div>
            <h3 class="mt-3 text-lg font-bold text-[var(--sh-section-title)]">
              {effectiveSub.current.planSnapshot.name}
            </h3>
            <p class="mt-1 text-sm text-[var(--sh-ai-sub)]">
              {formatMoney(effectiveSub.current.planSnapshot)}
              <span class="text-[var(--sh-exam-card-border)]"> · </span>
              <span class="capitalize">{effectiveSub.current.source}</span>
            </p>
            <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs text-[var(--sh-ai-sub)]">Starts</dt>
                <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
                  {formatUtcIsoToIstDate(effectiveSub.current.startsAt)}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-[var(--sh-ai-sub)]">Ends</dt>
                <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
                  {formatUtcIsoToIstDate(effectiveSub.current.endsAt)}
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-[var(--sh-ai-sub)]">Overall window</dt>
                <dd class="mt-0.5 font-medium text-[var(--sh-section-title)]">
                  {formatUtcIsoToIstDate(effectiveSub.startsDate)}
                  <span class="text-[var(--sh-ai-sub)]"> → </span>
                  {formatUtcIsoToIstDate(effectiveSub.endsDate)}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Next periods -->
          {#if effectiveSub.next?.length}
            <div>
              <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--sh-ai-sub)]">
                Scheduled next
              </h3>
              <ul class="flex flex-col gap-3">
                {#each effectiveSub.next as item, i (item.planId + item.startsAt + i)}
                  <li
                    class="rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] p-4"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs font-semibold text-[var(--sh-section-title)]">
                        {item.planSnapshot.name}
                      </span>
                      {#if item.planSnapshot.isTrial}
                        <span
                          class="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200"
                        >
                          Trial
                        </span>
                      {:else}
                        <span
                          class="rounded-full border border-[var(--sh-exam-card-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--sh-ai-sub)]"
                        >
                          Paid
                        </span>
                      {/if}
                      <span class="text-xs text-[var(--sh-ai-sub)]">· {formatMoney(item.planSnapshot)}</span>
                    </div>
                    <p class="mt-2 text-xs text-[var(--sh-ai-sub)]">
                      Starts after your current plan · <span class="capitalize">{item.source}</span>
                    </p>
                    <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt class="text-[11px] text-[var(--sh-ai-sub)]">Starts</dt>
                        <dd class="font-medium text-[var(--sh-section-title)]">
                          {formatUtcIsoToIstDate(item.startsAt)}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-[11px] text-[var(--sh-ai-sub)]">Ends</dt>
                        <dd class="font-medium text-[var(--sh-section-title)]">
                          {formatUtcIsoToIstDate(item.endsAt)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Auto-renew -->
          <div
            class="flex flex-col gap-4 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm font-semibold text-[var(--sh-section-title)]">Auto-renew</p>
              <p class="mt-0.5 text-xs text-[var(--sh-ai-sub)]">
                {effectiveSub.autoRenew
                  ? 'Your plan will renew automatically when the billing period ends.'
                  : 'Renewal is off — you may need to subscribe again after the current period.'}
              </p>
              {#if actionError}
                <p class="mt-2 text-xs text-[var(--pc-error-text)]" role="alert">{actionError}</p>
              {/if}
            </div>
            <div class="flex flex-shrink-0 flex-wrap gap-2">
              {#if effectiveSub.autoRenew}
                <button
                  type="button"
                  class="rounded-xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_45%,var(--sh-exam-card-border))] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--accent-cta-pink)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-cta-pink)_12%,transparent)] disabled:opacity-50"
                  disabled={autoRenewBusy}
                  onclick={() => void setAutoRenew(false)}
                >
                  {autoRenewBusy ? '…' : 'Turn off auto-renew'}
                </button>
              {:else}
                <button
                  type="button"
                  class="rounded-xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_45%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--accent-cta-pink)_14%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-cta-pink)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-cta-pink)_22%,transparent)] disabled:opacity-50"
                  disabled={autoRenewBusy}
                  onclick={() => void setAutoRenew(true)}
                >
                  {autoRenewBusy ? '…' : 'Enable auto-renew'}
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    {/await}
  </section>

  {#if !needsAuth}
    <section
      class="mb-10 overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]"
      aria-labelledby="payment-history-heading"
      onmouseenter={prefetchTransactions}
      onfocusin={prefetchTransactions}
    >
      <button
        type="button"
        id="payment-history-heading"
        class="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_28%,var(--sh-exam-card-bg))] sm:px-6 sm:py-[1.125rem]"
        onclick={togglePaymentHistory}
        aria-expanded={paymentHistoryOpen}
        aria-controls="payment-history-panel"
      >
        <div class="min-w-0">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--sh-ai-sub)]">
            Payment history
          </h2>
          <p class="mt-0.5 text-xs text-[var(--sh-ai-sub)]">
            Hover to preload · click to expand. Dates in IST.
          </p>
        </div>
        <span
          class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--sh-exam-card-border)] text-[var(--sh-ai-sub)] transition-transform duration-200 {paymentHistoryOpen
            ? 'rotate-180'
            : ''}"
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>

      {#if paymentHistoryOpen}
        <div
          id="payment-history-panel"
          class="border-t border-[var(--sh-exam-card-border)] px-5 pb-5 pt-0 sm:px-6"
        >
          <div class="flex flex-wrap items-center justify-end gap-2 pb-3 pt-4">
            <button
              type="button"
              class="text-xs font-semibold text-[var(--accent-cta-pink)] underline-offset-2 hover:underline disabled:opacity-50"
              onclick={() => void loadTransactions()}
              disabled={transactionsLoading}
            >
              Refresh
            </button>
          </div>

          {#if transactionsLoading}
            <div class="space-y-3 animate-pulse">
              <div class="h-12 rounded-lg bg-[color-mix(in_srgb,var(--sh-exam-card-border)_50%,transparent)]"></div>
              <div class="h-12 rounded-lg bg-[color-mix(in_srgb,var(--sh-exam-card-border)_40%,transparent)]"></div>
            </div>
          {:else if transactionsError}
            <p class="text-sm text-[var(--pc-error-text)]" role="alert">{transactionsError}</p>
          {:else if transactions.length === 0}
            <p class="text-sm text-[var(--sh-ai-sub)]">No payments yet.</p>
          {:else}
            <div class="overflow-x-auto rounded-xl border border-[var(--sh-exam-card-border)]">
              <table class="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr
                    class="border-b border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))]"
                  >
                    <th class="px-4 py-3 font-semibold text-[var(--sh-section-title)]">Purchase date</th>
                    <th class="px-4 py-3 font-semibold text-[var(--sh-section-title)]">Amount</th>
                    <th class="px-4 py-3 font-semibold text-[var(--sh-section-title)]">Status</th>
                    <th class="px-4 py-3 font-semibold text-[var(--sh-section-title)]">Provider</th>
                    <th class="hidden px-4 py-3 font-semibold text-[var(--sh-section-title)] sm:table-cell"
                      >Payment ref.</th
                    >
                  </tr>
                </thead>
                <tbody>
                  {#each transactions as tx (tx._id)}
                    <tr
                      class="border-b border-[color-mix(in_srgb,var(--sh-exam-card-border)_70%,transparent)] last:border-0"
                    >
                      <td class="whitespace-nowrap px-4 py-3 text-[var(--sh-section-title)]">
                        {formatUtcIsoToIstDate(tx.createdAt)}
                      </td>
                      <td class="whitespace-nowrap px-4 py-3 font-medium text-[var(--sh-section-title)]">
                        {formatTxAmount(tx)}
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize {tx.status?.toLowerCase() ===
                          'success'
                            ? 'bg-[color-mix(in_srgb,var(--pc-success-bg)_80%,transparent)] text-[var(--pc-success-text)]'
                            : 'bg-[color-mix(in_srgb,var(--sh-exam-card-border)_55%,transparent)] text-[var(--sh-ai-sub)]'}"
                        >
                          {tx.status || '—'}
                        </span>
                      </td>
                      <td class="px-4 py-3 capitalize text-[var(--sh-ai-sub)]">{providerLabel(tx.provider)}</td>
                      <td
                        class="hidden max-w-[12rem] truncate px-4 py-3 font-mono text-xs text-[var(--sh-ai-sub)] sm:table-cell"
                        title={tx.providerPaymentId ?? ''}
                      >
                        {tx.providerPaymentId ?? '—'}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
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
    class="subscription-bottom-bar pointer-events-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--accent-cta-pink)_55%,var(--sh-exam-card-border))] px-4 py-3 shadow-[0_-4px_28px_rgba(0,0,0,0.1)] backdrop-blur-sm sm:px-5"
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
      class="shrink-0 cursor-pointer rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[color-mix(in_srgb,var(--accent-cta-pink)_40%,var(--sh-exam-card-hover-border))] transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_78%,var(--accent-cta-pink))] active:scale-[0.99] sm:px-5"
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
