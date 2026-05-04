<script lang="ts">
  import { afterNavigate, invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import { page } from '$app/state';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import AddPhoneModal from '$lib/components/AddPhoneModal.svelte';
  import { afterPhoneVerifiedAction } from '$lib/stores/afterPhoneVerified';
  import { authStore } from '$lib/stores/auth';

  let { children } = $props();

  const isTestAttempt = $derived(page.url.pathname.includes('/test-attempt'));

  const defaultProfile = $derived(
    $authStore.users.find((u) => u.defaultProfile) ?? $authStore.users[0] ?? null
  );

  const needsPhone = $derived(
    !!$authStore.token &&
      !!defaultProfile &&
      !!defaultProfile.profileEmail?.trim() &&
      !defaultProfile.profilePhone?.trim()
  );

  let showPhoneModal = $state(false);

  $effect(() => {
    if (!browser) return;
    showPhoneModal = !!needsPhone;
  });

  function syncPhoneToMatchingProfiles(phone: string) {
    const users = get(authStore).users;
    const def = users.find((u) => u.defaultProfile) ?? users[0];
    const pid = def?.userProfileId;
    if (!pid) return;
    for (const u of users) {
      if (u.userProfileId === pid) {
        authStore.updateUser({ _id: u._id, profilePhone: phone });
      }
    }
  }

  async function handlePhoneVerified(phone: string) {
    syncPhoneToMatchingProfiles(phone);
    showPhoneModal = false;
    await invalidateAll();
    const run = get(afterPhoneVerifiedAction);
    afterPhoneVerifiedAction.set(null);
    if (run) await Promise.resolve(run());
  }

  afterNavigate(() => {
    if (typeof document === 'undefined') return;
    document.getElementById('layout-main-scroll')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
</script>

{#if isTestAttempt}
  <main class="min-h-screen bg-[var(--ta-page-bg)]">
    {@render children()}
  </main>
{:else}
  <Sidebar role="student">
    {@render children()}
  </Sidebar>
{/if}

<AddPhoneModal
  open={showPhoneModal}
  email={defaultProfile?.profileEmail}
  token={$authStore.token}
  onVerified={handlePhoneVerified}
/>
