<script lang="ts">
  import GoogleRoleSignIn from '$lib/components/GoogleRoleSignIn.svelte';

  type AccountType = 'student' | 'tutor' | 'institute';

  let selected: AccountType | null = $state(null);

  const accountTypes: {
    id: AccountType;
    label: string;
    description: string;
  }[] = [
    {
      id: 'student',
      label: 'Student',
      description: 'Practice PYQs, take tests, and track progress'
    },
    {
      id: 'tutor',
      label: 'Tutor',
      description: 'Create tests, manage batches, and analyze performance'
    },
    {
      id: 'institute',
      label: 'Institute',
      description: 'Manage tutors, batches, and view analytics'
    }
  ];

  const roleStyles: Record<AccountType, {
    selectedBg: string;
    selectedBorder: string;
    selectedGlow: string;
    iconSelectedBg: string;
    iconColor: string;
    radioDot: string;
  }> = {
    student: {
      selectedBg:     'bg-[var(--login-option-student-bg)]',
      selectedBorder: 'border-[var(--login-option-student-border)]',
      selectedGlow:   'shadow-[var(--login-option-student-glow)]',
      iconSelectedBg: 'bg-[var(--login-icon-student-bg)]',
      iconColor:      'text-[var(--login-icon-student-color)]',
      radioDot:       'bg-[var(--login-icon-student-color)]'
    },
    tutor: {
      selectedBg:     'bg-[var(--login-option-tutor-bg)]',
      selectedBorder: 'border-[var(--login-option-tutor-border)]',
      selectedGlow:   'shadow-[var(--login-option-tutor-glow)]',
      iconSelectedBg: 'bg-[var(--login-icon-tutor-bg)]',
      iconColor:      'text-[var(--login-icon-tutor-color)]',
      radioDot:       'bg-[var(--login-icon-tutor-color)]'
    },
    institute: {
      selectedBg:     'bg-[var(--login-option-institute-bg)]',
      selectedBorder: 'border-[var(--login-option-institute-border)]',
      selectedGlow:   'shadow-[var(--login-option-institute-glow)]',
      iconSelectedBg: 'bg-[var(--login-icon-institute-bg)]',
      iconColor:      'text-[var(--login-icon-institute-color)]',
      radioDot:       'bg-[var(--login-icon-institute-color)]'
    }
  };
</script>

<svelte:head>
  <title>Continue with Google — ExamFlow</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="
  min-h-screen font-sans flex items-center justify-center px-4 py-12
  bg-[linear-gradient(160deg,var(--login-bg-from)_0%,var(--login-bg-to)_100%)]
">
  <div class="w-full max-w-md">

    <div class="
      rounded-card px-8 py-9
      bg-[var(--login-card-bg)]
      border border-[var(--login-card-border)]
      shadow-[var(--login-card-shadow)]
      backdrop-blur-sm
    ">

      <div class="mb-7 text-center">
        <h1 class="mb-1.5 text-2xl font-bold tracking-tight text-[var(--login-heading-color)]">
          Continue with Google
        </h1>
        <p class="text-sm text-[var(--login-subtext-color)]">
          Choose your account type to sign in or get started instantly
        </p>
      </div>

      <div class="mb-7 flex flex-col gap-3">
        {#each accountTypes as type}
          {@const isSelected = selected === type.id}
          {@const rs = roleStyles[type.id]}

          <button
            type="button"
            onclick={() => (selected = type.id)}
            class="
              group flex w-full cursor-pointer items-center gap-4
              rounded-item border px-4 py-4 text-left
              transition-all duration-200
              {isSelected
                ? `${rs.selectedBg} ${rs.selectedBorder} ${rs.selectedGlow}`
                : 'bg-[var(--login-option-bg)] border-[var(--login-option-border)] hover:bg-[var(--login-option-hover-bg)] hover:border-[var(--login-option-hover-border)]'}
            "
          >

            <div class="
              flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-icon
              transition-colors duration-200
              {isSelected ? rs.iconSelectedBg : 'bg-[var(--login-icon-default-bg)]'}
            ">
              {#if type.id === 'student'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={rs.iconColor}>
                  <path d="M12 3L2 8l10 5 10-5-10-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M6 10.5v5c0 1.933 2.686 3.5 6 3.5s6-1.567 6-3.5v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M22 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              {:else if type.id === 'tutor'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={rs.iconColor}>
                  <circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M21 20c0-2.761-2.239-5-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={rs.iconColor}>
                  <rect x="3"  y="3"  width="7" height="8" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                  <rect x="14" y="3"  width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                  <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                  <rect x="3"  y="15" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
                </svg>
              {/if}
            </div>

            <div class="min-w-0 flex-1">
              <p class="mb-0.5 text-sm font-semibold text-[var(--login-label-color)]">
                {type.label}
              </p>
              <p class="text-xs leading-relaxed text-[var(--login-desc-color)]">
                {type.description}
              </p>
            </div>

            <div class="
              flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2
              transition-all duration-150
              {isSelected
                ? `${rs.selectedBorder} bg-[rgba(255,255,255,0.08)]`
                : 'border-[var(--login-radio-border)] bg-[var(--login-radio-bg)]'}
            ">
              {#if isSelected}
                <div class="h-1.5 w-1.5 rounded-full {rs.radioDot}"></div>
              {/if}
            </div>

          </button>
        {/each}
      </div>

      <GoogleRoleSignIn {selected} />

      <div class="mt-5 text-center">
        <a
          href="/"
          class="text-xs transition-colors text-[var(--login-back-color)] hover:text-[var(--login-back-hover-color)]"
        >
          Back to home
        </a>
      </div>

    </div>
  </div>
</div>