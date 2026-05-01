<script lang="ts">
  import GoogleRoleSignIn from '$lib/components/GoogleRoleSignIn.svelte';
  import type { AccountType } from '$lib/api/auth';

  let selectedRole = $state<AccountType>('student');

  const roleOptions: { label: string; value: AccountType; hint: string }[] = [
    { label: 'Student', value: 'student', hint: 'Practice tests and analytics' },
    { label: 'Teacher', value: 'tutor', hint: 'Manage classes and learners' },
    { label: 'Institute', value: 'institute', hint: 'Run organization workflows' }
  ];

  // SVGs for Icons
  const Icons = {
    Zap: `<path d="M13 2L3 14h9l-1 8L21 10h-9l1-8z"/>`,
    GraduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5"/>`
  };
</script>

<svelte:head>
  <title>Student Login — ExamAbhyas</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="
  min-h-screen font-sans flex items-center justify-center px-4 py-12
  bg-[linear-gradient(160deg,var(--login-bg-from)_0%,var(--login-bg-to)_100%)]
">
  <div class="w-full max-w-[400px]">
    <!-- BRANDING LOGO -->
    <div class="flex items-center justify-center gap-3 mb-10">
      <div class="w-10 h-10 rounded-xl border border-[var(--login-card-border)] bg-[var(--login-card-bg)] flex items-center justify-center shadow-lg shadow-black/5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-[var(--login-heading-color)]">
          {@html Icons.Zap}
        </svg>
      </div>
      <h2 class="text-xl font-black tracking-tight text-[var(--login-heading-color)]">
        Exam<span class="text-[var(--login-heading-color)]">Abhyas</span>
      </h2>
    </div>

    <div class="
      rounded-3xl pt-8 pb-10 px-8
      bg-[var(--login-card-bg)]
      border border-[var(--login-card-border)]
      shadow-[var(--login-card-shadow)]
      backdrop-blur-sm
    ">
      <div class="mb-10 text-center">
        <h1 class="mb-2 text-2xl font-extrabold tracking-tight text-[var(--login-heading-color)]">
          Welcome Back
        </h1>
        <p class="text-sm text-[var(--login-subtext-color)] leading-relaxed">
          Sign in to access your practice tests, analytics, and study materials.
        </p>
      </div>

      <div class="space-y-6">
        <div class="space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-[var(--login-subtext-color)]">
            Select account type
          </p>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {#each roleOptions as role}
              <button
                type="button"
                class={`rounded-xl border px-3 py-3 text-left transition-all ${
                  selectedRole === role.value
                    ? 'border-[var(--login-option-hover-border)] bg-[var(--login-option-hover-bg)] text-[var(--login-label-color)]'
                    : 'border-[var(--login-card-border)] hover:border-[var(--login-option-hover-border)] text-[var(--login-label-color)]'
                }`}
                on:click={() => (selectedRole = role.value)}
              >
                <p class="text-sm font-bold text-[var(--login-label-color)]">{role.label}</p>
                <p class="text-[11px] text-[var(--login-desc-color)]">{role.hint}</p>
              </button>
            {/each}
          </div>
        </div>

        <GoogleRoleSignIn selected={selectedRole} />
        
        <p class="text-[10px] text-center text-[var(--login-subtext-color)] px-4 uppercase tracking-widest font-bold">
          Continue with Google for selected role
        </p>
      </div>

      <div class="mt-10 pt-8 border-t border-[var(--login-card-border)] text-center">
        <a
          href="/"
          class="text-sm font-bold transition-colors text-[var(--login-back-color)] hover:text-[var(--login-back-hover-color)] flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to home
        </a>
      </div>
    </div>

    <p class="mt-8 text-center text-xs text-[var(--login-subtext-color)]">
      © {new Date().getFullYear()} ExamAbhyas. All rights reserved.
    </p>
  </div>
</div>

<style>
  :global(.rounded-3xl) {
    border-radius: 1.5rem;
  }
</style>
