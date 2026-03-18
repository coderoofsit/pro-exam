<script lang="ts">
  import GoogleRoleSignIn from '$lib/components/GoogleRoleSignIn.svelte';

  type AccountType = 'student' | 'tutor' | 'institute';

  let selected: AccountType | null = $state(null);

  const accountTypes: {
    id: AccountType;
    label: string;
    description: string;
    iconBg: string;
    iconColor: string;
    accentBorder: string;
    accentBg: string;
  }[] = [
    {
      id: 'student',
      label: 'Student',
      description: 'Practice PYQs, take tests, and track progress',
      iconBg: 'bg-brand-primary-light',
      iconColor: 'text-brand-primary',
      accentBorder: 'border-brand-secondary',
      accentBg: 'bg-brand-secondary-light'
    },
    {
      id: 'tutor',
      label: 'Tutor',
      description: 'Create tests, manage batches, and analyze performance',
      iconBg: 'bg-brand-tutor-light',
      iconColor: 'text-brand-tutor',
      accentBorder: 'border-brand-tutor',
      accentBg: 'bg-brand-tutor-light'
    },
    {
      id: 'institute',
      label: 'Institute',
      description: 'Manage tutors, batches, and view analytics',
      iconBg: 'bg-brand-institute-light',
      iconColor: 'text-brand-institute',
      accentBorder: 'border-brand-institute',
      accentBg: 'bg-brand-institute-light'
    }
  ];
</script>

<svelte:head>
  <title>Continue with Google — ExamFlow</title>
  <link
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="min-h-screen bg-surface-page font-sans flex items-center justify-center px-4 py-12">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="mb-8 flex items-center justify-center gap-2.5">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-content-primary shadow-md">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="white" stroke-width="1.8" stroke-linecap="round" />
          <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" stroke="white" stroke-width="1.8" stroke-linecap="round" />
          <path d="M9 7v4l1.5-1L12 11V7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <span class="text-xl font-bold tracking-tight text-content-primary">ExamFlow</span>
    </div>

    <!-- Card -->
    <div class="rounded-card border border-surface-border bg-surface-card px-8 py-9 shadow-card">
      <!-- Heading -->
      <div class="mb-7 text-center">
        <h1 class="mb-1.5 text-2xl font-bold tracking-tight text-content-primary">
          Continue with Google
        </h1>
        <p class="text-sm text-content-secondary">
          Choose your account type to sign in or get started instantly
        </p>
      </div>

      <!-- Account type options -->
      <div class="mb-7 flex flex-col gap-3">
        {#each accountTypes as type}
          {@const isSelected = selected === type.id}
          <button
            type="button"
            onclick={() => (selected = type.id)}
            class={`group flex w-full cursor-pointer items-center gap-4 rounded-item border px-4 py-4 text-left shadow-item transition-all duration-200 ${
              isSelected
                ? `${type.accentBg} ${type.accentBorder} shadow-item-hover`
                : 'border-surface-border bg-surface-card hover:border-brand-primary/40 hover:bg-brand-primary-light/40 hover:shadow-item-hover'
            }`}
          >
            <!-- Icon box -->
            <div
              class={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-icon transition-colors duration-200 ${
                isSelected ? type.iconBg : 'bg-surface-subtle'
              }`}
            >
              {#if type.id === 'student'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={type.iconColor}>
                  <path d="M12 3L2 8l10 5 10-5-10-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  <path d="M6 10.5v5c0 1.933 2.686 3.5 6 3.5s6-1.567 6-3.5v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M22 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              {:else if type.id === 'tutor'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={type.iconColor}>
                  <circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="1.8" />
                  <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M21 20c0-2.761-2.239-5-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class={type.iconColor}>
                  <rect x="3" y="3" width="7" height="8" rx="1.5" stroke="currentColor" stroke-width="1.8" />
                  <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8" />
                  <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8" />
                  <rect x="3" y="15" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.8" />
                </svg>
              {/if}
            </div>

            <!-- Text -->
            <div class="min-w-0 flex-1">
              <p class="mb-0.5 text-sm font-semibold text-content-primary">{type.label}</p>
              <p class="text-xs leading-relaxed text-content-secondary">{type.description}</p>
            </div>

            <!-- Radio dot -->
            <div
              class={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150 ${
                isSelected ? `${type.accentBorder} bg-white` : 'border-surface-border'
              }`}
            >
              {#if isSelected}
                <div
                  class={`h-1.5 w-1.5 rounded-full ${
                    type.id === 'student'
                      ? 'bg-brand-primary'
                      : type.id === 'tutor'
                        ? 'bg-brand-tutor'
                        : 'bg-brand-institute'
                  }`}
                ></div>
              {/if}
            </div>
          </button>
        {/each}
      </div>

      <!-- Google Sign In -->
      <GoogleRoleSignIn {selected} />

      <!-- Back to home -->
      <div class="mt-5 text-center">
        <a href="/" class="text-xs text-content-muted transition-colors hover:text-content-secondary">
          Back to home
        </a>
      </div>
    </div>
  </div>
</div>