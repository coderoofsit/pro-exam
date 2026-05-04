<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		startFreeTrial,
		createSubscriptionCheckout,
		verifySubscriptionPayment,
		type SubscriptionPlan
	} from '$lib/api/subscription';
	import { openRazorpayCheckout } from '$lib/payments/razorpay';
	import { afterPhoneVerifiedAction } from '$lib/stores/afterPhoneVerified';
	import { authStore, AUTH_STORAGE_KEY } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedPlanId = $state<string | null>(null);

	let showTrialConfirm = $state(false);
	let showTrialSuccess = $state(false);
	let submittingTrial = $state(false);
	let trialError = $state<string | null>(null);

	let submittingPaid = $state(false);
	let paidError = $state<string | null>(null);
	let showPaidSuccess = $state(false);

	const defaultProfile = $derived(
		$authStore.users.find((u) => u.defaultProfile) ?? $authStore.users[0] ?? null
	);

	const trialUsed = $derived(!!defaultProfile?.subscription?.trialUsed);

	const visiblePlans = $derived((data.plans ?? []).filter((p) => !(p.isTrial && trialUsed)));

	const selectedPlan = $derived(
		selectedPlanId ? (visiblePlans.find((p) => p._id === selectedPlanId) ?? null) : null
	);

	const hasProfilePhone = $derived(!!defaultProfile?.profilePhone?.trim());

	/** Paid plan requires a verified phone on file — blocks Continue until added. */
	const continueBlockedNoPhone = $derived(
		!!selectedPlan && !selectedPlan.isTrial && !hasProfilePhone
	);

	function requestPhoneThenResumeCheckout() {
		afterPhoneVerifiedAction.set(() => {
			void startPaidPlanCheckout();
		});
	}

	onMount(() => {
		if (!data.ssrAuthMissing || typeof localStorage === 'undefined') return;
		if (!localStorage.getItem(AUTH_STORAGE_KEY)?.trim()) return;
		authStore.restore();
		void invalidateAll();
	});

	$effect(() => {
		if (selectedPlanId && !visiblePlans.some((p) => p._id === selectedPlanId)) {
			selectedPlanId = null;
		}
	});

	function formatPrice(p: SubscriptionPlan) {
		if (p.price === 0) return 'Free';
		try {
			return new Intl.NumberFormat('en-IN', {
				style: 'currency',
				currency: p.currency || 'INR',
				maximumFractionDigits: 0
			}).format(p.price);
		} catch {
			return `${p.currency} ${p.price}`;
		}
	}

	function onContinue() {
		if (!selectedPlanId || !selectedPlan) return;

		trialError = null;
		paidError = null;

		if (selectedPlan.isTrial) {
			showTrialConfirm = true;
			return;
		}

		if (!hasProfilePhone) {
			requestPhoneThenResumeCheckout();
			return;
		}

		void startPaidPlanCheckout();
	}

	function onSelectPlan(plan: SubscriptionPlan) {
		selectedPlanId = plan._id;
		paidError = null;
		trialError = null;
		if (!plan.isTrial && !hasProfilePhone) {
			requestPhoneThenResumeCheckout();
		}
	}

	function cancelTrialConfirm() {
		if (submittingTrial) return;
		showTrialConfirm = false;
		trialError = null;
	}

	async function confirmFreeTrial() {
		if (!selectedPlanId || !selectedPlan?.isTrial) return;

		submittingTrial = true;
		trialError = null;

		try {
			const res = await startFreeTrial({
				planId: selectedPlanId,
				token: $authStore.token
			});

			if (!res.success) {
				trialError = res.message || 'Could not start your trial. Please try again.';
				return;
			}

			showTrialConfirm = false;
			showTrialSuccess = true;
		} finally {
			submittingTrial = false;
		}
	}

	async function startPaidPlanCheckout() {
		if (!selectedPlanId || !selectedPlan || selectedPlan.isTrial) return;

		const payUser =
			get(authStore).users.find((u) => u.defaultProfile) ?? get(authStore).users[0];
		if (!payUser?.profilePhone?.trim()) {
			showPhoneRequiredModal = true;
			return;
		}

		submittingPaid = true;
		paidError = null;

		try {
			const checkoutRes = await createSubscriptionCheckout({
				planId: selectedPlanId,
				token: $authStore.token
			});

			if (!checkoutRes.success) {
				paidError = checkoutRes.message || 'Could not create checkout. Please try again.';
				return;
			}

			const checkout = checkoutRes.data?.data;
			if (
				!checkout?.razorpayKeyId ||
				(!checkout?.subscriptionId && !checkout?.orderId)
			) {
				paidError = 'Invalid checkout response from server.';
				return;
			}

			const payment = await openRazorpayCheckout({
				key: checkout.razorpayKeyId,
				orderId: checkout.orderId,
				subscriptionId: checkout.subscriptionId,
				amount: checkout.amount,
				currency: checkout.currency,
				name: checkout.name ?? 'Exam Abhyas',
				description: checkout.description ?? `${selectedPlan.name} subscription`,
				prefill: {
					name:
						[defaultProfile?.firstName, defaultProfile?.lastName].filter(Boolean).join(' ') || undefined,
					email: defaultProfile?.profileEmail || undefined,
					contact: defaultProfile?.profilePhone || undefined
				},
				notes: {
					planId: checkout.planId ?? selectedPlan._id,
					planName: selectedPlan.name
				},
				theme: {
					color: '#111827'
				}
			});

			if (!payment?.razorpay_subscription_id) {
				paidError = 'Payment succeeded but subscription id is missing from Razorpay response.';
				return;
			}

			const verifyRes = await verifySubscriptionPayment({
				razorpay_subscription_id: payment.razorpay_subscription_id,
				razorpay_payment_id: payment.razorpay_payment_id,
				razorpay_signature: payment.razorpay_signature,
				token: $authStore.token
			});

			if (!verifyRes.success) {
				paidError = verifyRes.message || 'Payment verification failed.';
				return;
			}

			showPaidSuccess = true;
		} catch (error) {
			paidError =
				error instanceof Error ? error.message : 'Payment could not be completed.';
		} finally {
			submittingPaid = false;
		}
	}

	async function onTrialSuccessContinue() {
		showTrialSuccess = false;
		await invalidateAll();
		await goto('/student/subscription');
	}

	async function onPaidSuccessContinue() {
		showPaidSuccess = false;
		await invalidateAll();
		await goto('/student/subscription');
	}
</script>

<svelte:head>
	<title>Choose a plan — Exam Abhyas</title>
</svelte:head>

<div class="relative mx-auto max-w-7xl px-4 pb-28 pt-2 sm:px-5 sm:pb-10">
	<header class="mb-10 text-center sm:mb-12">
		<p
			class="mb-2 inline-flex items-center justify-center rounded-full border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_50%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--sh-ai-sub)]"
		>
			Step 1 of 2
		</p>
		<h1 class="text-2xl font-bold tracking-tight text-[var(--sh-section-title)] sm:text-3xl">
			Pick the plan that fits your goals
		</h1>
		<p class="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--sh-ai-sub)] sm:text-base">
			Full access to unlimited tests, batches, and your progress history — billed fairly in INR.
			Start with a trial or go straight to Pro.
		</p>
	</header>

	{#if data.ssrAuthMissing}
		<div
			class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-10 text-center text-sm text-[var(--sh-ai-sub)]"
			role="status"
		>
			Sign in to view subscription plans. If you are already signed in, refresh this page.
		</div>
	{:else if data.error}
		<div
			class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]"
			role="alert"
		>
			{data.error}
		</div>
	{:else if !data.plans?.length}
		<div
			class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-14 text-center"
		>
			<p class="text-sm font-medium text-[var(--sh-section-title)]">No plans available yet</p>
			<p class="mt-1 text-xs text-[var(--sh-ai-sub)]">Please check back soon or contact support.</p>
		</div>
	{:else if !visiblePlans.length}
		<div
			class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-6 py-14 text-center"
		>
			<p class="text-sm font-medium text-[var(--sh-section-title)]">No paid plans to show</p>
			<p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
				Trial options are hidden because your free trial was already used. Contact support if you
				need help.
			</p>
		</div>
	{:else}
		<div class="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 md:items-stretch">
			{#each visiblePlans as plan (plan._id)}
				<button
					type="button"
					class="group relative flex min-h-0 w-full min-w-0 flex-col rounded-2xl border-2 p-6 text-left transition
            {selectedPlanId === plan._id
						? 'border-[var(--accent-cta-pink)] bg-[color-mix(in_srgb,var(--accent-cta-pink)_08%,var(--sh-exam-card-bg))] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)]'
						: 'border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-md'}"
					onclick={() => onSelectPlan(plan)}
				>
					{#if plan.isTrial}
						<span
							class="absolute -right-1 -top-2 rounded-full bg-[var(--badge-new-bg)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)] shadow-sm"
						>
							Trial
						</span>
					{/if}

					<div class="mb-4 flex items-start justify-between gap-2">
						<div>
							<h2 class="text-lg font-bold text-[var(--sh-section-title)]">{plan.name}</h2>
							<p class="mt-1 text-xs text-[var(--sh-ai-sub)]">
								{plan.durationDays} days ·
								{plan.isTrial ? 'Try everything at no cost' : 'Full Pro access'}
							</p>
						</div>

						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--sh-exam-card-border)] transition group-hover:border-[var(--accent-cta-pink)] {selectedPlanId === plan._id
								? 'border-[var(--accent-cta-pink)] bg-[var(--accent-cta-pink)]'
								: ''}"
							aria-hidden="true"
						>
							{#if selectedPlanId === plan._id}
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-white">
									<path
										d="M20 6L9 17l-5-5"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{/if}
						</span>
					</div>

					<p class="mb-4 text-3xl font-bold tabular-nums text-[var(--sh-section-title)]">
						{formatPrice(plan)}
						{#if plan.price > 0}
							<span class="text-sm font-normal text-[var(--sh-ai-sub)]"> / period</span>
						{/if}
					</p>

					<ul class="mt-auto space-y-2.5 text-sm text-[var(--sh-ai-sub)]">
						{#each plan.description ?? [] as line (line)}
							<li class="flex gap-2">
								<span
									class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-cta-cyan)_25%,transparent)] text-[var(--accent-cta-cyan)]"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="M20 6L9 17l-5-5"
											stroke="currentColor"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
								<span class="leading-snug">{line}</span>
							</li>
						{/each}
					</ul>
				</button>
			{/each}
		</div>

		{#if paidError}
			<div
				class="mt-5 rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-5 py-4 text-sm text-[var(--pc-error-text)]"
				role="alert"
			>
				{paidError}
			</div>
		{/if}

		<div
			class="pointer-events-none fixed bottom-[68px] md:bottom-0 left-0 right-0 z-[50] flex justify-center border-t border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-bg)_92%,transparent)] px-4 py-4 pb-4 md:pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 md:left-[var(--sb-left-offset)]"
		>
			<div
				class="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
			>
				<p class="text-center text-sm text-[var(--sh-ai-sub)] sm:text-left">
					{#if selectedPlanId}
						<span class="font-medium text-[var(--sh-section-title)]">Ready when you are.</span>
						{#if selectedPlan?.isTrial}
							Continue to confirm and start your free trial.
						{:else if continueBlockedNoPhone}
							Add and verify your phone number (popup) to pay for this plan.
						{:else}
							Continue to pay securely and activate your plan.
						{/if}
					{:else}
						Select a plan above to unlock the next step.
					{/if}
				</p>

				<button
					type="button"
					class="btn-cta-subscription sm:shrink-0"
					disabled={!selectedPlanId ||
						submittingTrial ||
						submittingPaid ||
						continueBlockedNoPhone}
					onclick={onContinue}
				>
					{#if submittingTrial}
						Starting…
					{:else if submittingPaid}
						Processing…
					{:else}
						Continue
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

{#if showTrialConfirm}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="trial-confirm-title"
		onclick={(e) => e.target === e.currentTarget && cancelTrialConfirm()}
	>
		<div
			class="max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="trial-confirm-title" class="text-lg font-bold text-[var(--sh-section-title)]">
				Start your free trial?
			</h2>

			<p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
				You’re about to activate the trial for
				<span class="font-semibold text-[var(--sh-section-title)]">
					{selectedPlan?.name ?? 'this plan'}
				</span>.
				You can use full Pro features for the trial period at no charge.
			</p>

			{#if trialError}
				<p
					class="mt-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-sm text-[var(--pc-error-text)]"
					role="alert"
				>
					{trialError}
				</p>
			{/if}

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class="rounded-xl border border-[var(--sh-exam-card-border)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--sh-section-title)] transition hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_40%,transparent)] disabled:opacity-50"
					onclick={cancelTrialConfirm}
					disabled={submittingTrial}
				>
					Cancel
				</button>

				<button
					type="button"
					class="rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[var(--sh-exam-card-hover-border)] transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => void confirmFreeTrial()}
					disabled={submittingTrial}
				>
					{submittingTrial ? 'Starting…' : 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showTrialSuccess}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="trial-success-title"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 text-center shadow-xl"
		>
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-cta-cyan)_22%,transparent)] text-[var(--accent-cta-cyan)]"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M20 6L9 17l-5-5"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<h2 id="trial-success-title" class="text-lg font-bold text-[var(--sh-section-title)]">
				Trial activated
			</h2>

			<p class="mt-2 text-sm text-[var(--sh-ai-sub)]">
				Your free trial is active. You can review your subscription anytime on the next page.
			</p>

			<button
				type="button"
				class="mt-6 w-full rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-3 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[var(--sh-exam-card-hover-border)] transition hover:opacity-95"
				onclick={() => void onTrialSuccessContinue()}
			>
				Go to subscription
			</button>
		</div>
	</div>
{/if}

{#if showPaidSuccess}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="paid-success-title"
	>
		<div
			class="w-full max-w-md rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 text-center shadow-xl"
		>
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pc-success-bg)_70%,transparent)] text-[var(--pc-success-text)]"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M20 6L9 17l-5-5"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<h2 id="paid-success-title" class="text-lg font-bold text-[var(--sh-section-title)]">
				Payment successful
			</h2>

			<p class="mt-2 text-sm text-[var(--sh-ai-sub)]">
				Your subscription has been activated successfully.
			</p>

			<button
				type="button"
				class="mt-6 w-full rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 py-3 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[var(--sh-exam-card-hover-border)] transition hover:opacity-95"
				onclick={() => void onPaidSuccessContinue()}
			>
				Go to subscription
			</button>
		</div>
	</div>
{/if}