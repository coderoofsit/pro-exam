<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { googleLogin, type BackendRole } from '$lib/api/auth';

  type AccountType = 'student' | 'tutor' | 'institute';

  let {
    selected,
    onSuccess
  }: {
    selected: AccountType | null;
    onSuccess?: (result: unknown) => void;
  } = $props();

  let googleButtonEl: HTMLDivElement | null = null;
  let isGoogleReady = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state('');

  function getRedirectPath(role: AccountType) {
    if (role === 'student') return '/student/dashboard';
    if (role === 'tutor') return '/tutor/dashboard';
    return '/institute/dashboard';
  }
  function mapRole(role: AccountType): BackendRole {
    if (role === 'tutor') return 'teacher';
    if (role === 'institute') return 'institute';
    return 'student';
  }

  async function handleGoogleCredential(response: { credential?: string }) {
    const idToken = response?.credential;

    if (!idToken || !selected) {
      errorMessage = 'Unable to get Google credential.';
      return;
    }

    errorMessage = '';
    isLoading = true;

    try {
      const result = await googleLogin({
        idToken,
        role: mapRole(selected)
      });

      onSuccess?.(result);
      await goto(getRedirectPath(selected));

    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : 'Google authentication failed';
    } finally {
      isLoading = false;
    }
  }

  function renderGoogleButton() {
    if (!browserReady() || !selected || !googleButtonEl || !window.google) return;

    googleButtonEl.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: "669946693353-dihobt6ckouhr1s8gb0l7dm6nkpqbg2j.apps.googleusercontent.com",
      callback: handleGoogleCredential
    });

    window.google.accounts.id.renderButton(googleButtonEl, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 380
    });

    isGoogleReady = true;
  }

  function browserReady() {
    return typeof window !== 'undefined';
  }

  onMount(() => {
    if (!browserReady()) return;

    const existingScript = document.querySelector(
      'script[data-google-identity="true"]'
    ) as HTMLScriptElement | null;

    const setup = () => {
      renderGoogleButton();
    };

    if (existingScript) {
      if (window.google) {
        setup();
      } else {
        existingScript.addEventListener('load', setup, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = setup;

    document.head.appendChild(script);
  });

  $effect(() => {
    if (selected && browserReady() && window.google) {
      renderGoogleButton();
    }
  });
</script>

{#if selected}
  <div class="space-y-3">
    <div class="flex justify-center">
      <div bind:this={googleButtonEl}></div>
    </div>

    {#if !isGoogleReady}
      <div class="text-center text-sm text-content-secondary">
        Loading Google sign-in...
      </div>
    {/if}

    {#if isLoading}
      <div class="text-center text-sm text-content-secondary">
        Verifying your Google account...
      </div>
    {/if}

    {#if errorMessage}
      <div class="rounded-item border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {errorMessage}
      </div>
    {/if}
  </div>
{/if}