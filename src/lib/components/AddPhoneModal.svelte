<script lang="ts">
	import { updatePhone, sendPhoneOtp, verifyPhoneOtp } from '$lib/api/auth';

	type Props = {
		open: boolean;
		email: string | undefined;
		token: string | null;
		/** Called after OTP verification succeeds; `phone` is the verified 10-digit number. */
		onVerified: (phone: string) => void;
	};

	let { open, email, token, onVerified }: Props = $props();

	let phoneInput = $state('');
	let otpInput = $state('');
	let savingPhone = $state(false);
	let sendingOtp = $state(false);
	let verifyingOtp = $state(false);
	let otpSent = $state(false);
	let actionError = $state('');
	let actionSuccess = $state('');
	let resendCooldown = $state(0);
	let resendTimer: ReturnType<typeof setInterval> | null = null;

	function resetForm() {
		phoneInput = '';
		otpInput = '';
		otpSent = false;
		actionError = '';
		actionSuccess = '';
		resendCooldown = 0;
		if (resendTimer) {
			clearInterval(resendTimer);
			resendTimer = null;
		}
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	function startCooldown() {
		resendCooldown = 30;
		if (resendTimer) clearInterval(resendTimer);
		resendTimer = setInterval(() => {
			resendCooldown -= 1;
			if (resendCooldown <= 0) {
				resendCooldown = 0;
				if (resendTimer) clearInterval(resendTimer);
			}
		}, 1000);
	}

	async function handleSaveAndSendOtp() {
		actionError = '';
		actionSuccess = '';
		const phone = phoneInput.trim();
		if (!/^\d{10}$/.test(phone)) {
			actionError = 'Enter a valid 10-digit phone number.';
			return;
		}
		if (!email?.trim()) {
			actionError = 'Email not found on your account. Please update your profile in Settings.';
			return;
		}
		savingPhone = true;
		const saveRes = await updatePhone({ email: email.trim(), phone, token });
		savingPhone = false;
		if (!saveRes.success) {
			actionError = saveRes.message || 'Failed to save phone.';
			return;
		}
		await doSendOtp(phone);
	}

	async function doSendOtp(phone: string) {
		sendingOtp = true;
		const res = await sendPhoneOtp({ phone, token });
		sendingOtp = false;
		if (!res.success) {
			actionError = res.message || 'Failed to send OTP.';
			return;
		}
		otpSent = true;
		actionSuccess = 'OTP sent to your phone.';
		startCooldown();
	}

	async function handleResendOtp() {
		actionError = '';
		actionSuccess = '';
		await doSendOtp(phoneInput.trim());
	}

	async function handleVerifyOtp() {
		actionError = '';
		actionSuccess = '';
		const otp = Number(otpInput.trim());
		if (!otp) {
			actionError = 'Enter the OTP.';
			return;
		}
		verifyingOtp = true;
		const res = await verifyPhoneOtp({ phone: phoneInput.trim(), otp, token });
		verifyingOtp = false;
		if (!res.success) {
			actionError = res.message || 'Invalid OTP.';
			return;
		}
		const verified = phoneInput.trim();
		onVerified(verified);
	}
</script>

{#if open}
	<!-- Non-dismissible: no backdrop click, no cancel — complete phone verification to continue. -->
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-phone-title"
	>
		<div
			class="max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
		>
			<h2 id="add-phone-title" class="text-lg font-bold text-[var(--sh-section-title)]">
				Add your phone number
			</h2>
			<p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
				A verified phone number is required before you can pay for a subscription. We’ll send a one-time
				code to confirm it’s yours — same secure flow as in Settings.
			</p>

			{#if !email?.trim()}
				<p
					class="mt-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-sm text-[var(--pc-error-text)]"
					role="alert"
				>
					No email on file. Please open
					<a href="/student/settings" class="font-semibold underline">Settings</a>
					to fix your account, then refresh this page.
				</p>
			{:else if !otpSent}
				<div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
					<input
						type="tel"
						bind:value={phoneInput}
						placeholder="10-digit mobile number"
						maxlength={10}
						autocomplete="tel-national"
						class="h-11 flex-1 rounded-xl border border-[var(--topbar-search-border)] bg-[var(--topbar-search-bg)] px-3 text-sm text-[var(--topbar-search-text)] outline-none placeholder:text-[var(--topbar-search-placeholder)] focus:border-[var(--topbar-search-border-focus)]"
					/>
					<button
						type="button"
						onclick={() => void handleSaveAndSendOtp()}
						disabled={savingPhone || sendingOtp}
						class="h-11 shrink-0 rounded-xl bg-[var(--sh-exam-card-arrow-bg)] px-4 text-sm font-semibold text-[var(--sh-exam-card-title)] ring-1 ring-[var(--sh-exam-card-hover-border)] disabled:cursor-not-allowed disabled:opacity-50"
					>
						{savingPhone ? 'Saving…' : sendingOtp ? 'Sending…' : 'Save & send OTP'}
					</button>
				</div>
			{:else}
				<p class="mt-4 text-xs text-[var(--sh-ai-sub)]">
					OTP sent to <span class="font-semibold text-[var(--sh-section-title)]">{phoneInput}</span>
				</p>
				<div class="mt-3 flex flex-col gap-3 sm:flex-row">
					<input
						type="text"
						inputmode="numeric"
						bind:value={otpInput}
						placeholder="Enter OTP"
						autocomplete="one-time-code"
						class="h-11 flex-1 rounded-xl border border-[var(--topbar-search-border)] bg-[var(--topbar-search-bg)] px-3 text-sm text-[var(--topbar-search-text)] outline-none placeholder:text-[var(--topbar-search-placeholder)] focus:border-[var(--topbar-search-border-focus)]"
					/>
					<button
						type="button"
						onclick={() => void handleVerifyOtp()}
						disabled={verifyingOtp}
						class="h-11 shrink-0 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						{verifyingOtp ? 'Verifying…' : 'Verify'}
					</button>
				</div>
				<button
					type="button"
					onclick={() => void handleResendOtp()}
					disabled={sendingOtp || resendCooldown > 0}
					class="mt-3 text-xs font-medium text-[var(--sh-ai-sub)] underline disabled:cursor-not-allowed disabled:opacity-50"
				>
					{resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : sendingOtp ? 'Sending…' : 'Resend OTP'}
				</button>
			{/if}

			{#if actionError}
				<p class="mt-4 text-sm text-red-500" role="alert">{actionError}</p>
			{/if}
			{#if actionSuccess}
				<p class="mt-2 text-sm text-emerald-600">{actionSuccess}</p>
			{/if}
		</div>
	</div>
{/if}
