<script lang="ts">
  import { authStore } from '$lib/stores/auth';
  import { updatePhone, sendPhoneOtp, verifyPhoneOtp, type GetMembershipsResponse } from '$lib/api/auth';

  type ProfileData = NonNullable<GetMembershipsResponse['data']>;

  let { data } = $props<{ data: { profileData: ProfileData | null } }>();

  let profile = $state<ProfileData | null>(data.profileData);

  const hasPhone = $derived(!!profile?.userProfileDetails?.phone);
  const isPhoneVerified = $derived(!!profile?.userProfileDetails?.isVerifiedPhone);

  let phoneInput = $state(profile?.userProfileDetails?.phone ?? '');
  let showAddPhone = $state(false);
  let showVerifyPhone = $state(false);
  let otpInput = $state('');
  let savingPhone = $state(false);
  let sendingOtp = $state(false);
  let verifyingOtp = $state(false);
  let otpSent = $state(false);
  let actionError = $state('');
  let actionSuccess = $state('');
  let resendCooldown = $state(0);
  let resendTimer: ReturnType<typeof setInterval> | null = null;

  function startCooldown() {
    resendCooldown = 30;
    if (resendTimer) clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      resendCooldown -= 1;
      if (resendCooldown <= 0) { resendCooldown = 0; if (resendTimer) clearInterval(resendTimer); }
    }, 1000);
  }

  function openAddPhone() {
    phoneInput = ''; actionError = ''; actionSuccess = ''; otpSent = false; otpInput = '';
    showAddPhone = true; showVerifyPhone = false;
  }

  function openVerifyPhone() {
    phoneInput = profile?.userProfileDetails?.phone ?? '';
    actionError = ''; actionSuccess = ''; otpSent = false; otpInput = '';
    showVerifyPhone = true; showAddPhone = false;
  }

  // Normalize phone: strip country code prefix, keep last 10 digits
  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  async function handleSaveAndSendOtp() {
    actionError = ''; actionSuccess = '';
    const phone = normalizePhone(phoneInput.trim());
    if (!/^\d{10}$/.test(phone)) { actionError = 'Enter a valid 10-digit phone number.'; return; }
    const email = profile?.userProfileDetails?.email;
    if (!email) { actionError = 'Email not found. Please refresh.'; return; }
    savingPhone = true;
    const saveRes = await updatePhone({ email, phone, token: $authStore.token });
    savingPhone = false;
    if (!saveRes.success) { actionError = saveRes.message || 'Failed to save phone.'; return; }
    if (profile?.userProfileDetails) {
      profile = { ...profile, userProfileDetails: { ...profile.userProfileDetails, phone, isVerifiedPhone: false } };
    }
    await doSendOtp(phone);
  }

  async function doSendOtp(phone: string) {
    const normalized = normalizePhone(phone);
    sendingOtp = true;
    const res = await sendPhoneOtp({ phone: normalized, token: $authStore.token });
    sendingOtp = false;
    if (!res.success) { actionError = res.message || 'Failed to send OTP.'; return; }
    otpSent = true; actionSuccess = 'OTP sent to your phone.';
    startCooldown();
  }

  async function handleResendOtp() {
    actionError = ''; actionSuccess = '';
    await doSendOtp(String(phoneInput).trim());
  }

  async function handleVerifyOtp() {
    actionError = ''; actionSuccess = '';
    const otp = Number(String(otpInput).trim());
    if (!otp) { actionError = 'Enter the OTP.'; return; }
    verifyingOtp = true;
    const res = await verifyPhoneOtp({ phone: normalizePhone(String(phoneInput).trim()), otp, token: $authStore.token });
    verifyingOtp = false;
    if (!res.success) { actionError = res.message || 'Invalid OTP.'; return; }
    actionSuccess = 'Phone verified successfully.';
    if (profile?.userProfileDetails) {
      profile = { ...profile, userProfileDetails: { ...profile.userProfileDetails, isVerifiedPhone: true } };
    }
    showVerifyPhone = false; showAddPhone = false; otpSent = false; otpInput = '';
  }
</script>

<svelte:head><title>Settings</title></svelte:head>

<div class="mx-auto w-full max-w-2xl min-w-0 text-[var(--page-text)]">
  <div class="mb-6">
    <h1 class="text-xl font-bold text-[var(--page-text)]">Settings</h1>
    <p class="mt-1 text-sm text-[var(--page-text-muted)]">Account & profile details</p>
  </div>

  {#if !profile}
    <div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-6 py-10 text-center">
      <p class="text-sm text-[var(--page-text-muted)]">Could not load profile details. Please refresh.</p>
    </div>
  {:else}
    <!-- Profile card -->
    <div class="mb-6 flex items-start gap-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-5 py-4">
      {#if profile.image}
        <img src={profile.image} alt="Profile" class="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
      {:else}
        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--topbar-dd-avatar-bg)] text-lg font-bold text-[var(--topbar-dd-avatar-text)] flex-shrink-0">
          {(profile.firstName?.[0] ?? '') + (profile.lastName?.[0] ?? '') || 'U'}
        </div>
      {/if}
      <div class="min-w-0">
        <p class="text-base font-semibold text-[var(--page-text)] truncate">{profile.firstName ?? ''} {profile.lastName ?? ''}</p>
        <p class="text-sm capitalize text-[var(--page-text-muted)]">{profile.role ?? ''}</p>
        {#if profile.preferredExams && profile.preferredExams.length > 0}
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each profile.preferredExams as exam}
              <span class="inline-flex items-center gap-1 rounded-lg border border-[var(--page-card-border)] bg-[var(--topbar-search-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--page-text-muted)]">
                {#if exam.image}
                  <img src={exam.image} alt="" class="h-3.5 w-3.5 rounded-full object-cover" />
                {/if}
                {typeof exam.name === 'object' ? (exam.name?.en ?? '') : (exam.name ?? '')}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Account section -->
    <p class="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--page-text-muted)]">Account</p>
    <div class="mb-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] overflow-hidden">
      <!-- Email -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--page-card-border)]">
        <div>
          <p class="text-xs text-[var(--page-text-muted)]">Email</p>
          <p class="mt-0.5 text-sm font-medium text-[var(--page-text)]">{profile.userProfileDetails?.email ?? '—'}</p>
        </div>
        {#if profile.userProfileDetails?.isVerified}
          <span class="flex items-center gap-1 text-xs font-medium text-emerald-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Verified
          </span>
        {:else}
          <span class="text-xs font-medium text-amber-500">Unverified</span>
        {/if}
      </div>

      <!-- Phone -->
      <div class="flex items-center justify-between px-5 py-4">
        <div>
          <p class="text-xs text-[var(--page-text-muted)]">Phone</p>
          <p class="mt-0.5 text-sm font-medium text-[var(--page-text)]">
            {#if hasPhone}+{profile.userProfileDetails?.countryCode ?? 91} {profile.userProfileDetails?.phone}
            {:else}<span class="text-[var(--page-text-muted)]">Not added</span>{/if}
          </p>
        </div>
        {#if isPhoneVerified}
          <span class="flex items-center gap-1 text-xs font-medium text-emerald-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Verified
          </span>
        {:else if hasPhone}
          <button type="button" onclick={openVerifyPhone} class="text-xs font-medium text-amber-500 hover:underline">Verify number</button>
        {:else}
          <button type="button" onclick={openAddPhone} class="text-xs font-medium text-[var(--page-link,#6366f1)] hover:underline">Add number</button>
        {/if}
      </div>
    </div>

    <!-- Add phone panel -->
    {#if showAddPhone}
      <div class="mb-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-5 py-5 flex flex-col gap-4">
        <p class="text-sm font-semibold text-[var(--page-text)]">Add Phone Number</p>
        {#if !otpSent}
          <div class="flex gap-2">
            <input type="tel" bind:value={phoneInput} placeholder="10-digit phone number" maxlength={10}
              class="flex-1 h-10 rounded-xl px-3 text-sm outline-none bg-[var(--topbar-search-bg)] border border-[var(--topbar-search-border)] text-[var(--topbar-search-text)] placeholder:text-[var(--topbar-search-placeholder)] focus:border-[var(--topbar-search-border-focus)]" />
            <button type="button" onclick={handleSaveAndSendOtp} disabled={savingPhone || sendingOtp}
              class="h-10 px-4 rounded-xl text-sm font-semibold bg-[var(--topbar-dd-action-icon-bg)] text-[var(--topbar-dd-action-icon-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {savingPhone ? 'Saving…' : sendingOtp ? 'Sending…' : 'Save & Send OTP'}
            </button>
          </div>
        {:else}
          <p class="text-xs text-[var(--page-text-muted)]">OTP sent to <span class="font-medium text-[var(--page-text)]">{phoneInput}</span></p>
          <div class="flex gap-2">
            <input type="number" bind:value={otpInput} placeholder="Enter OTP"
              class="flex-1 h-10 rounded-xl px-3 text-sm outline-none bg-[var(--topbar-search-bg)] border border-[var(--topbar-search-border)] text-[var(--topbar-search-text)] placeholder:text-[var(--topbar-search-placeholder)] focus:border-[var(--topbar-search-border-focus)]" />
            <button type="button" onclick={handleVerifyOtp} disabled={verifyingOtp}
              class="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {verifyingOtp ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <button type="button" onclick={handleResendOtp} disabled={sendingOtp || resendCooldown > 0}
            class="self-start text-xs font-medium text-[var(--page-text-muted)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : sendingOtp ? 'Sending…' : 'Resend OTP'}
          </button>
        {/if}
        {#if actionError}<p class="text-xs text-red-500">{actionError}</p>{/if}
        {#if actionSuccess}<p class="text-xs text-emerald-500">{actionSuccess}</p>{/if}
      </div>
    {/if}

    <!-- Verify phone panel -->
    {#if showVerifyPhone}
      <div class="mb-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-5 py-5 flex flex-col gap-4">
        <p class="text-sm font-semibold text-[var(--page-text)]">Verify Phone Number</p>
        {#if !otpSent}
          <p class="text-xs text-[var(--page-text-muted)]">
            We'll send an OTP to <span class="font-medium text-[var(--page-text)]">+{profile.userProfileDetails?.countryCode ?? 91} {profile.userProfileDetails?.phone}</span>
          </p>
          <button type="button" onclick={() => doSendOtp(profile?.userProfileDetails?.phone ?? '')} disabled={sendingOtp}
            class="self-start h-10 px-4 rounded-xl text-sm font-semibold bg-[var(--topbar-dd-action-icon-bg)] text-[var(--topbar-dd-action-icon-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
            {sendingOtp ? 'Sending…' : 'Send OTP'}
          </button>
        {:else}
          <div class="flex gap-2">
            <input type="number" bind:value={otpInput} placeholder="Enter OTP"
              class="flex-1 h-10 rounded-xl px-3 text-sm outline-none bg-[var(--topbar-search-bg)] border border-[var(--topbar-search-border)] text-[var(--topbar-search-text)] placeholder:text-[var(--topbar-search-placeholder)] focus:border-[var(--topbar-search-border-focus)]" />
            <button type="button" onclick={handleVerifyOtp} disabled={verifyingOtp}
              class="h-10 px-4 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
              {verifyingOtp ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          <button type="button" onclick={handleResendOtp} disabled={sendingOtp || resendCooldown > 0}
            class="self-start text-xs font-medium text-[var(--page-text-muted)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : sendingOtp ? 'Sending…' : 'Resend OTP'}
          </button>
        {/if}
        {#if actionError}<p class="text-xs text-red-500">{actionError}</p>{/if}
        {#if actionSuccess}<p class="text-xs text-emerald-500">{actionSuccess}</p>{/if}
      </div>
    {/if}

    <!-- All profiles -->
    {#if profile.allProfiles && profile.allProfiles.length > 0}
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--page-text-muted)]">All Profiles</p>
      <div class="flex flex-col gap-3">
        {#each profile.allProfiles as p (p._id)}
          <div class="flex items-center gap-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-5 py-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--topbar-dd-avatar-bg)] text-sm font-bold text-[var(--topbar-dd-avatar-text)] flex-shrink-0">
              {(p.firstName?.[0] ?? '') + (p.lastName?.[0] ?? '') || 'U'}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-[var(--page-text)] truncate">{p.firstName ?? ''} {p.lastName ?? ''}</p>
              <p class="text-xs capitalize text-[var(--page-text-muted)]">
                {p.role ?? ''}
                {#if p.instituteId} · {p.instituteId.firstName} {p.instituteId.lastName}{/if}
                {#if p.teacherId} · {p.teacherId.firstName} {p.teacherId.lastName}{/if}
              </p>
              {#if p.preferredExams && p.preferredExams.length > 0}
                <div class="mt-2 flex flex-wrap gap-1.5">
                  {#each p.preferredExams as exam}
                    <span class="inline-flex items-center gap-1 rounded-lg border border-[var(--page-card-border)] bg-[var(--topbar-search-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--page-text-muted)]">
                      {#if exam.image}
                        <img src={exam.image} alt="" class="h-3.5 w-3.5 rounded-full object-cover" />
                      {/if}
                      {typeof exam.name === 'object' ? (exam.name?.en ?? '') : (exam.name ?? '')}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
            {#if p.defaultProfile}<span class="text-[10px] font-bold uppercase tracking-wide text-emerald-500 flex-shrink-0">Default</span>{/if}
            {#if !p.isActive}<span class="text-[10px] font-bold uppercase tracking-wide text-red-400 flex-shrink-0">Inactive</span>{/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
