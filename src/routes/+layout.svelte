<script lang="ts">
  import { browser } from '$app/environment';
  import favicon from '$lib/assets/favicon.svg';
  import type { MembershipUser } from '$lib/api/auth';
  import '../app.css';
  import { authStore } from '$lib/stores/auth';

  let { children, data } = $props<{
    children: import('svelte').Snippet;
    data: {
      authToken: string | null;
      membershipUsers: MembershipUser[];
    };
  }>();

  let hydratedFromServer = $state(false);

  if (browser) {
    authStore.restoreToken();
  }

  $effect(() => {
    if (!browser || hydratedFromServer) return;
    const token = data?.authToken ?? null;
    if (!token) {
      hydratedFromServer = true;
      return;
    }

    authStore.setAuth({
      users: (data?.membershipUsers ?? []).map((user) => ({
        _id: user._id,
        userProfileId: user.userProfileId,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        defaultProfile: user.defaultProfile,
        subscription: user.subscription
      })),
      token,
      role: $authStore.role,
      profileId: $authStore.profileId
    });

    hydratedFromServer = true;
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}