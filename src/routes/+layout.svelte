<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import favicon from '$lib/assets/favicon.svg';
  import { syncAuthSessionCookies } from '$lib/auth/syncSession';
  import '../app.css';
  import { authStore, mapMembershipUserToAuthUser } from '$lib/stores/auth';
  import NotificationHost from '$lib/components/notifications/NotificationHost.svelte';

  let { children, data } = $props<{
    children: import('svelte').Snippet;
    data: {
      authToken: string | null;
      membershipUsers: import('$lib/api/auth').MembershipUser[];
      ownedBy: string | null;
      ownedRole: string | null;
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

    const users = (data?.membershipUsers ?? [])
      .sort((a, b) => (b.defaultProfile ? 1 : 0) - (a.defaultProfile ? 1 : 0))
      .map(mapMembershipUserToAuthUser);

    authStore.setAuth({
      users,
      token,
      role: $authStore.role,
      profileId: $authStore.profileId,
      ownedBy: data?.ownedBy ?? null,
      ownedRole: data?.ownedRole ?? null
    });

    void syncAuthSessionCookies({
      token,
      role: $authStore.role,
      ownedBy: data?.ownedBy ?? null,
      ownedRole: data?.ownedRole ?? null
    });

    hydratedFromServer = true;
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<NotificationHost />
{#key page.url.pathname}
  {@render children()}
{/key}