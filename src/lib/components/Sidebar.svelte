<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { goto, invalidateAll } from "$app/navigation";
  import { Notification } from "$lib/components/Notification";
  import { authStore, type AuthUser } from "$lib/stores/auth";
  import {
    getMembershipUsers,
    normalizeMembershipProfileRef,
    selectMembershipProfile,
    updateFcmToken,
    sendPhoneOtp,
    updatePhone,
    verifyPhoneOtp,
    type MembershipUser,
    type MembershipResponse,
    type SelectMembershipApiBody,
  } from "$lib/api/auth";
  import {
    listenForegroundMessages,
    requestNotificationPermissionAndToken,
  } from "$lib/fcm";
  import { fetchUnreadNotificationCount } from "$lib/api/notifications";
  import { themeStore } from "$lib/stores/theme";

  type Role = "student" | "tutor" | "institute";
  type SidebarIcon = "dashboard" | "exams" | "tests" | "batch" | "subscription";

  type SidebarItem = {
    id: string;
    label: string;
    href: string;
    icon: SidebarIcon;
  };

  let { role, children }: { role: Role; children?: import("svelte").Snippet } =
    $props();

  let sidebarCollapsed = $state(false);
  let profileDropdownOpen = $state(false);
  let selectedUserIndex = $state(
    $authStore.users.findIndex((u) => u.defaultProfile) !== -1
      ? $authStore.users.findIndex((u) => u.defaultProfile)
      : 0,
  );
  let isLoadingUsers = $state(false);
  let selectingMembershipDefault = $state(false);
  let notificationSidebarOpen = $state(false);
  let unreadNotificationCount = $state(0);
  let membershipSwitchRequestId = $state(0);
  let fcmTokenFetchInFlight: Promise<string> | null = null;
  let unreadCountRequestInFlight: Promise<void> | null = null;
  /** Prevents repeated GET /membership (effect re-runs, dev double-mount, failed attempts). */
  let membershipFetchCompleted = $state(false);
  /** Tracks route transitions so we auto-collapse nav once when entering “create own test” exam flow. */
  let wasOwnTestExamRoute = $state(false);

  // -- Phone verification modal --
  let phoneModal = $state({ open: false, phone: '', step: 'input' as 'input' | 'otp', otp: '', loading: false, error: '', success: '' });

  function normalizePhone(raw: string) {
    const digits = raw.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  async function phoneModalSendOtp() {
    phoneModal.error = ''; phoneModal.success = '';
    const phone = normalizePhone(phoneModal.phone);
    if (!/^\d{10}$/.test(phone)) { phoneModal.error = 'Enter a valid 10-digit number.'; return; }
    phoneModal.loading = true;
    const res = await sendPhoneOtp({ phone, token: $authStore.token });
    phoneModal.loading = false;
    if (!res.success) { phoneModal.error = res.message || 'Failed to send OTP.'; return; }
    phoneModal.step = 'otp'; phoneModal.success = 'OTP sent!';
  }

  async function phoneModalVerify() {
    phoneModal.error = ''; phoneModal.success = '';
    const otp = Number(String(phoneModal.otp).trim());
    if (!otp) { phoneModal.error = 'Enter the OTP.'; return; }
    phoneModal.loading = true;
    const res = await verifyPhoneOtp({ phone: normalizePhone(phoneModal.phone), otp, token: $authStore.token });
    phoneModal.loading = false;
    if (!res.success) { phoneModal.error = res.message || 'Invalid OTP.'; return; }
    phoneModal.success = 'Phone verified!';
    setTimeout(() => { phoneModal.open = false; invalidateAll(); }, 900);
  }

  /** Full-bleed, no extra top inset — timer + question should sit under the app topbar. */
  const isTestAttemptRoute = $derived(
    page.url.pathname.startsWith("/student/test-attempt"),
  );

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function toggleProfileDropdown() {
    if (selectingMembershipDefault) return;
    profileDropdownOpen = !profileDropdownOpen;
  }

  function closeProfileDropdown() {
    profileDropdownOpen = false;
  }

  function openNotificationSidebar() {
    notificationSidebarOpen = true;
  }

  function closeNotificationSidebar() {
    notificationSidebarOpen = false;
  }

  const navItemsByRole: Record<Role, SidebarItem[]> = {
    student: [
      {
        id: "sidebar-dashboard",
        label: "Home",
        href: "/student/dashboard",
        icon: "dashboard",
      },
      {
        id: "sidebar-exams",
        label: "Exams",
        href: "/student/exams",
        icon: "exams",
      },
      {
        id: "sidebar-tests",
        label: "Tests",
        href: "/student/tests",
        icon: "tests",
      },
      {
        id: "sidebar-batch",
        label: "Batch",
        href: "/student/batch",
        icon: "batch",
      },
      {
        id: "sidebar-subscription",
        label: "Subscription",
        href: "/student/subscription",
        icon: "subscription",
      },
    ],
    tutor: [
      {
        id: "sidebar-dashboard",
        label: "Home",
        href: "/tutor/dashboard",
        icon: "dashboard",
      },
      {
        id: "sidebar-tests",
        label: "Tests",
        href: "/tutor/tests",
        icon: "tests",
      },
      {
        id: "sidebar-batch",
        label: "Batch",
        href: "/tutor/batch",
        icon: "batch",
      },
      {
        id: "sidebar-subscription",
        label: "Subscription",
        href: "/tutor/subscription",
        icon: "subscription",
      },
    ],
    institute: [
      {
        id: "sidebar-dashboard",
        label: "Home",
        href: "/institute/dashboard",
        icon: "dashboard",
      },
      {
        id: "sidebar-exams",
        label: "Exams",
        href: "/institute/exams",
        icon: "exams",
      },
      {
        id: "sidebar-batch",
        label: "Batch",
        href: "/institute/batch",
        icon: "batch",
      },
      {
        id: "sidebar-subscription",
        label: "Subscription",
        href: "/institute/subscription",
        icon: "subscription",
      },
    ],
  };

  const sidebarNavItems = $derived(navItemsByRole[role]);
  const isDark = $derived($themeStore === "dark");
  const isAutoCollapseRoute = $derived(
    /^\/student\/tests\/own\/[^/]+/.test(page.url.pathname) ||
    (/^\/student-exam/.test(page.url.pathname) && page.url.searchParams.get("view") === "chapters")
  );
  const isCollapsed = $derived(sidebarCollapsed);

  $effect(() => {
    if (isAutoCollapseRoute && !wasOwnTestExamRoute) {
      sidebarCollapsed = true;
    }
    wasOwnTestExamRoute = isAutoCollapseRoute;
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.style.setProperty(
      "--sb-left-offset",
      isCollapsed ? "var(--sb-width-collapsed)" : "var(--sb-width-expanded)",
    );
  });

  /** Subscription routes: show default profile’s plan status in the topbar. */
  const showSubscriptionStatusInTopbar = $derived(
    page.url.pathname.includes("/subscription"),
  );

  /** Default membership profile — used for subscription UI and sorting. */
  const defaultProfileUser = $derived(
    $authStore.users.find((u) => u.defaultProfile) ??
      $authStore.users[0] ??
      null,
  );

  function isActive(href: string): boolean {
    return (
      page.url.pathname === href || page.url.pathname.startsWith(href + "/")
    );
  }

  /** GET /membership body — API uses `success` (not only legacy `ok`). */
  function extractMembershipUsersFromResponse(
    body: MembershipResponse | null | undefined,
  ): MembershipUser[] | null {
    if (!body) return null;
    const ok = body.ok === true || body.success === true;
    if (!ok) return null;
    const users = body.data?.users;
    return Array.isArray(users) ? users : null;
  }

  function getInitials(user?: AuthUser) {
    if (!user) return "U";
    const first = user.firstName?.[0] ?? "";
    const last = user.lastName?.[0] ?? "";
    return `${first}${last}`.trim() || "U";
  }

  /** Full reload so every page picks up the new default profile + token from storage. */
  function hardReloadCurrentPage() {
    if (browser) {
      window.location.reload();
    }
  }

  async function syncAuthSessionCookies(token: string, fcmToken?: string | null) {
    try {
      const response = await fetch("/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fcmToken: fcmToken ?? "" }),
      });
      return response.ok;
    } catch (error) {
      console.error("[Sidebar] Failed to sync session cookies.", error);
      return false;
    }
  }

  async function getFcmTokenFromFirebase(): Promise<string> {
    if (!browser) return "";
    if (fcmTokenFetchInFlight) return fcmTokenFetchInFlight;

    fcmTokenFetchInFlight = (async () => {
      console.log("[Sidebar] Requesting FCM token from Firebase...");
      const fcmResult = await requestNotificationPermissionAndToken();
      if (!fcmResult.success || !fcmResult.token?.trim()) {
        console.warn(
          "[Sidebar] Firebase FCM token unavailable:",
          fcmResult.success ? "empty token" : (fcmResult.error ?? "unknown"),
        );
        return "";
      }
      console.log("[Sidebar] Firebase FCM token received.");
      return fcmResult.token.trim();
    })();

    try {
      return await fcmTokenFetchInFlight;
    } finally {
      fcmTokenFetchInFlight = null;
    }
  }

  async function refreshUnreadNotificationCount() {
    if (unreadCountRequestInFlight) {
      await unreadCountRequestInFlight;
      return;
    }

    unreadCountRequestInFlight = (async () => {
      const res = await fetchUnreadNotificationCount(undefined, {
        token: $authStore.token,
      });
      if (!res.success) {
        console.error("[Sidebar] Failed to fetch unread notification count.", res.message);
        return;
      }
      const body = res.data;
      if (!body?.success) {
        console.error(
          "[Sidebar] Unread notification count API returned unsuccessful response.",
          body?.message ?? "Unknown error",
        );
        return;
      }
      unreadNotificationCount = Math.max(0, Number(body.data) || 0);
    })();

    try {
      await unreadCountRequestInFlight;
    } finally {
      unreadCountRequestInFlight = null;
    }
  }

  async function resolveAndSyncFcmToken(params: {
    authToken: string;
    responseFcmToken?: string | null;
  }) {
    const incomingToken = params.responseFcmToken?.trim() ?? "";
    if (incomingToken) return incomingToken;

    const freshFcmToken = await getFcmTokenFromFirebase();
    if (!freshFcmToken) {
      return "";
    }
    const updateRes = await updateFcmToken({
      fcmToken: freshFcmToken,
      token: params.authToken,
    });

    if (!updateRes.success) {
      console.error("[Sidebar] Failed to update FCM token.", updateRes.message);
      return "";
    }
    const updateBody = updateRes.data as
      | { success?: boolean; message?: string }
      | undefined;
    if (updateBody?.success === false) {
      console.error(
        "[Sidebar] update-fcm rejected by API.",
        updateBody.message ?? "Unknown API error",
      );
      return "";
    }

    return freshFcmToken;
  }

  async function selectUser(index: number) {
    const requestId = ++membershipSwitchRequestId;
    const clickedUser = $authStore.users[index];
    if (!clickedUser) return;

    // Immediately update local store for instant visual feedback:
    // 1. Mark clicked user as default
    // 2. Sort users so default is at top
    // 3. This triggers $effect to sync selectedUserIndex to 0
    const locallyUpdatedUsers = $authStore.users.map((u, i) => ({
      ...u,
      defaultProfile: i === index,
    })).sort((a, b) => (b.defaultProfile ? 1 : 0) - (a.defaultProfile ? 1 : 0));

    authStore.setUsers(locallyUpdatedUsers);

    if (clickedUser.defaultProfile) {
      profileDropdownOpen = false;
      hardReloadCurrentPage();
      return;
    }

    /** Membership row `_id` + `userProfileId` from GET /membership (required by API). */
    const membershipId = clickedUser._id;
    const userProfiledId = clickedUser.userProfileId?.trim();
    if (!userProfiledId) {
      console.error(
        "[Sidebar] Missing userProfileId on user — run GET /membership first or refresh the page.",
      );
      return;
    }

    selectingMembershipDefault = true;
    try {
      const res = await selectMembershipProfile({
        membershipId,
        userProfiledId,
        token: $authStore.token,
      });

      if (!res.success) {
        console.error("Failed to set default profile", res.message);
        return;
      }

      const root = res.data as SelectMembershipApiBody;
      if (
        root?.success === true &&
        root.data &&
        typeof root.data.token === "string" &&
        root.data.token.trim().length > 0 &&
        Array.isArray(root.data.users) &&
        root.data.users.length > 0
      ) {
        const finalFcmToken = await resolveAndSyncFcmToken({
          authToken: root.data.token,
          responseFcmToken: root.data.fcmToken ?? "",
        });
        if (requestId !== membershipSwitchRequestId) return;

        const sessionSynced = await syncAuthSessionCookies(
          root.data.token,
          finalFcmToken,
        );
        if (!sessionSynced) {
          console.error(
            "[Sidebar] Failed to sync auth/fcm session cookies after membership switch.",
          );
          return;
        }
        if (requestId !== membershipSwitchRequestId) return;

        const mapped = mapMembershipUsers(root.data.users);
        authStore.setAuthAfterMembership({
          token: root.data.token,
          users: mapped,
          role: $authStore.role,
        });

        // Show phone modal if phone missing or not verified
        if (!root.data.phone || !root.data.isVerifiedPhone) {
          phoneModal = { open: true, phone: root.data.phone ?? '', step: 'input', otp: '', loading: false, error: '', success: '' };
        }

        hardReloadCurrentPage();
        return;
      }

      console.warn(
        "[Sidebar] select-membership returned no token/users; falling back to GET /membership",
      );
      await reloadMembershipFromServer();
      selectedUserIndex = 0;
      profileDropdownOpen = false;
      hardReloadCurrentPage();
    } finally {
      selectingMembershipDefault = false;
    }
  }

  async function handleLogout() {
    await fetch("/logout", { method: "POST" });
    authStore.clear?.();
    profileDropdownOpen = false;
    await goto("/");
  }

  async function goToCreateProfile() {
    profileDropdownOpen = false;

    const profileCreatePathByRole: Record<Role, string> = {
      student: "/student/profile/create",
      tutor: "/tutor/profile/create",
      institute: "/institute/profile/create",
    };

    await goto(profileCreatePathByRole[role]);
  }

  function usersHaveMembershipShape(users: AuthUser[]) {
    return (
      users.length > 0 &&
      users.some((u) => "subscription" in u || "defaultProfile" in u)
    );
  }

  function applyMembershipApiUsers(apiUsers: MembershipUser[]) {
    const mappedUsers = mapMembershipUsers(apiUsers);
    authStore.setUsers(mappedUsers);
    selectedUserIndex = 0;
  }

  function mapMembershipUsers(users: MembershipUser[]): AuthUser[] {
    const sorted = [...users].sort((a, b) => {
      const ap = a.defaultProfile ? 1 : 0;
      const bp = b.defaultProfile ? 1 : 0;
      return bp - ap;
    });
    return sorted.map((user) => {
      const prof = normalizeMembershipProfileRef(user.userProfileId);
      return {
        _id: user._id,
        userProfileId: prof.userProfileId,
        profileEmail: prof.email,
        profilePhone: prof.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        defaultProfile: user.defaultProfile,
        subscription: user.subscription
          ? {
              isSubscribed: !!user.subscription.isSubscribed,
              isTrial: !!user.subscription.isTrial,
              planId: user.subscription.planId ?? null,
              expiry: user.subscription.expiry ?? null,
              trialUsed: !!user.subscription.trialUsed,
            }
          : null,
        instituteId: null,
        teacherId: null,
        adminId: null,
      };
    });
  }

  async function loadUsersIfMissing() {
    if (isLoadingUsers) return;

    const token = $authStore.token;
    if (!token) return;

    if (usersHaveMembershipShape($authStore.users)) return;
    if (membershipFetchCompleted) return;

    isLoadingUsers = true;

    try {
      const response = await getMembershipUsers(token);

      if (!response.success) return;

      const membershipResponse = response.data as MembershipResponse;
      const apiUsers = extractMembershipUsersFromResponse(membershipResponse);
      if (apiUsers == null) return;

      applyMembershipApiUsers(apiUsers);
    } catch (error) {
      console.error("Failed to load membership users", error);
    } finally {
      isLoadingUsers = false;
      membershipFetchCompleted = true;
    }
  }

  async function reloadMembershipFromServer() {
    const token = $authStore.token;
    if (!token) return;

    isLoadingUsers = true;
    try {
      const response = await getMembershipUsers(token);
      if (!response.success) return;

      const membershipResponse = response.data as MembershipResponse;
      const apiUsers = extractMembershipUsersFromResponse(membershipResponse);
      if (apiUsers == null) return;

      applyMembershipApiUsers(apiUsers);
    } catch (error) {
      console.error("Failed to reload membership users", error);
    } finally {
      isLoadingUsers = false;
      membershipFetchCompleted = true;
    }
  }

  const currentUser = $derived(
    $authStore.users[selectedUserIndex] ?? $authStore.users[0] ?? null,
  );

  $effect(() => {
    if (!$authStore.token) {
      membershipFetchCompleted = false;
      return;
    }
    void loadUsersIfMissing();
  });

  $effect(() => {
    if ($authStore.users.length === 0) {
      selectedUserIndex = 0;
      return;
    }

    if (selectedUserIndex > $authStore.users.length - 1) {
      selectedUserIndex = 0;
    }
  });

  $effect(() => {
    const idx = $authStore.users.findIndex((u) => u.defaultProfile);
    if (idx !== -1) {
      selectedUserIndex = idx;
    }
  });

  $effect(() => {
    if (!browser) return;
    console.log("[Sidebar][Dot] Initializing foreground message listener.");
    let disposed = false;
    let unsubscribe: null | (() => void) = null;

    void listenForegroundMessages((payload) => {
      console.log(
        "[Sidebar][Dot] Foreground push notification received in app (independent of system toast settings).",
        payload,
      );
      void refreshUnreadNotificationCount();
      console.log("[Sidebar][Dot] Refreshing unread count from backend.");
    }).then((off) => {
      if (disposed) {
        console.log(
          "[Sidebar][Dot] Listener resolved after dispose, calling unsubscribe immediately.",
        );
        off?.();
        return;
      }
      unsubscribe = off ?? null;
      console.log(
        "[Sidebar][Dot] Foreground listener ready.",
        unsubscribe ? "unsubscribe attached" : "no unsubscribe returned",
      );
    }).catch((error) => {
      console.error("[Sidebar][Dot] Failed to initialize foreground listener.", error);
    });

    return () => {
      disposed = true;
      console.log("[Sidebar][Dot] Cleaning up foreground listener.");
      unsubscribe?.();
    };
  });

  $effect(() => {
    if (!browser || !$authStore.token) return;
    void refreshUnreadNotificationCount();
  });

  $effect(() => {
    if (!browser || !$authStore.token) return;
    if (page.url.pathname !== "/student/dashboard") return;
    console.log(
      "[Sidebar][UnreadCount] Dashboard loaded, refreshing unread count in background.",
    );
    void refreshUnreadNotificationCount();
  });

  function onToggleTheme() {
    themeStore.toggle();
  }
</script>

<div
  class="flex h-dvh min-h-0 bg-[var(--page-bg)] font-sans text-[var(--page-text)]"
>
  <aside
    class="
    relative h-dvh flex-shrink-0 flex-col overflow-hidden
    border-r border-[var(--sb-border-color)]
    bg-[linear-gradient(160deg,var(--sb-bg-from)_0%,var(--sb-bg-to)_100%)]
    shadow-[var(--sb-shadow)]
    transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
    before:absolute before:inset-x-0 before:top-0 before:h-px before:pointer-events-none
    before:bg-[linear-gradient(90deg,transparent,var(--sb-edge-glow),transparent)]
    hidden md:flex
    {isCollapsed
      ? 'w-[var(--sb-width-collapsed)]'
      : 'w-[var(--sb-width-expanded)]'}
  "
  >
    <div
      class="flex items-center gap-3 px-4 py-[18px] min-h-[68px] border-b border-[var(--sb-divider)] flex-shrink-0"
    >
      <div
        class="
        flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center
        bg-[linear-gradient(135deg,var(--sb-logo-gradient-from),var(--sb-logo-gradient-to))]
        shadow-[var(--sb-logo-glow)] transition-shadow duration-200
      "
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M9 7v4l1.5-1L12 11V7"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      {#if !isCollapsed}
        <div class="flex flex-col min-w-0 overflow-hidden">
          <span
            class="
            block whitespace-nowrap overflow-hidden text-ellipsis tracking-tight
            text-[length:var(--sb-font-size-brand)] font-[var(--sb-font-brand)]
            text-[var(--sb-brand-name-color)]
          ">Exam Abhyas</span
          >
          <span
            class="
            block mt-px capitalize tracking-[0.04em]
            text-[length:var(--sb-font-size-role)] font-medium
            text-[var(--sb-brand-role-color)]
          ">{role} Panel</span
          >
        </div>
      {/if}
    </div>

    <nav
      class="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {#each sidebarNavItems as navItem}
        {@const active = isActive(navItem.href)}
        <a
          id={navItem.id}
          href={navItem.href}
          title={isCollapsed ? navItem.label : undefined}
          aria-current={active ? "page" : undefined}
          class="
            relative flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline whitespace-nowrap
            text-[length:var(--sb-font-size-nav)] font-[var(--sb-font-nav)]
            transition-[background,color,box-shadow] duration-150
            {active
            ? 'bg-[var(--sb-nav-active-bg)] text-[var(--sb-nav-active-text)] shadow-[var(--sb-nav-active-glow)]'
            : 'text-[var(--sb-nav-text)] hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-text)]'}
          "
        >
          {#if active}
            <span
              class="
              absolute left-0 top-1/2 -translate-y-1/2
              w-[3px] h-5 rounded-r-full
              bg-[var(--sb-nav-active-indicator)]
              shadow-[0_0_8px_var(--sb-nav-active-indicator)]
            "
            ></span>
          {/if}

          <span
            class="
            flex-shrink-0 w-5 h-5 flex items-center justify-center
            {active
              ? 'text-[var(--sb-nav-active-icon)]'
              : 'text-[var(--sb-nav-icon)]'}
          "
          >
            {#if navItem.icon === "dashboard"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="8"
                  height="8"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <rect
                  x="13"
                  y="3"
                  width="8"
                  height="5"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <rect
                  x="13"
                  y="12"
                  width="8"
                  height="9"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <rect
                  x="3"
                  y="15"
                  width="8"
                  height="6"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
              </svg>
            {:else if navItem.icon === "exams"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
                <rect
                  x="9"
                  y="3"
                  width="6"
                  height="4"
                  rx="1.5"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <path
                  d="M9 12h6M9 16h4"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            {:else if navItem.icon === "tests"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 3l2 2-6 6"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M18 5l2-2"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            {:else if navItem.icon === "batch"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="9"
                  cy="7"
                  r="3"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <path
                  d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
                <circle
                  cx="17"
                  cy="7"
                  r="2.25"
                  stroke="currentColor"
                  stroke-width="1.75"
                />
                <path
                  d="M21 20c0-2.485-1.79-4.5-4-4.5"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                />
              </svg>
            {:else if navItem.icon === "subscription"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </span>

          {#if !isCollapsed}
            <span class="overflow-hidden text-ellipsis">{navItem.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div
      class="px-2.5 py-2.5 border-t border-[var(--sb-divider)] flex-shrink-0"
    >
      <button
        type="button"
        onclick={toggleSidebar}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!isCollapsed}
        class="
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
          border-none bg-transparent cursor-pointer
          text-[length:var(--sb-font-size-collapse)] font-medium tracking-[0.08em] uppercase
          text-[var(--sb-collapse-text)]
          transition-[background,color,opacity] duration-150
          hover:enabled:bg-[var(--sb-collapse-hover-bg)] hover:enabled:text-[var(--sb-collapse-hover-text)]
          disabled:cursor-not-allowed disabled:opacity-40
        "
      >
        <span
          class="
          flex-shrink-0 w-5 h-5 flex items-center justify-center
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          {isCollapsed ? 'rotate-180' : ''}
        "
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        {#if !isCollapsed}
          {#if defaultProfileUser?.profileEmail || defaultProfileUser?.profilePhone}
            <span
              class="flex min-w-0 flex-col items-start gap-0.5 text-left normal-case tracking-normal"
            >
              {#if defaultProfileUser.profileEmail}
                <span
                  class="max-w-[11rem] truncate text-[10px] leading-tight text-[var(--sb-collapse-text)]"
                  title={defaultProfileUser.profileEmail}
                >
                  {defaultProfileUser.profileEmail}
                </span>
              {/if}
              {#if defaultProfileUser.profilePhone}
                <span
                  class="text-[10px] leading-tight text-[var(--sb-collapse-text)]"
                >
                  {defaultProfileUser.profilePhone}
                </span>
              {/if}
            </span>
          {:else}
            <span class="whitespace-nowrap">Collapse</span>
          {/if}
        {/if}
      </button>
    </div>
  </aside>

  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <header
      class="
      fixed top-0 right-0 left-0 md:left-[var(--sb-left-offset)] z-30
      h-[68px] flex items-center px-6
      bg-[var(--topbar-bg)]
      border-b border-[var(--topbar-border)]
      shadow-[var(--topbar-shadow)]
      backdrop-blur-md
    "
    >
      <div class="flex flex-1 items-center justify-between gap-4">
        <div></div>
        <div class="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onclick={onToggleTheme}
            title={$themeStore === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
            aria-label={$themeStore === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"}
            class="
              relative flex h-11 w-11 items-center justify-center rounded-xl
              bg-[var(--topbar-icon-btn-bg)]
              border border-[var(--topbar-icon-btn-border)]
              text-[var(--topbar-icon-btn-color)]
              transition-[border,color] duration-150
              hover:border-[var(--topbar-icon-btn-hover-border)]
              hover:text-[var(--topbar-icon-btn-hover-color)]
            "
          >
            {#if $themeStore === "dark"}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  stroke-width="1.8"
                />
                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            {:else}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M21 14.5A8.5 8.5 0 0 1 9.5 3 6.5 6.5 0 0 0 21 14.5Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </button>
          <button
            type="button"
            onclick={() => { goto('/student/settings'); }}
            title="Settings"
            aria-label="Settings"
            class="
              relative flex h-11 w-11 items-center justify-center rounded-xl
              bg-[var(--topbar-icon-btn-bg)]
              border border-[var(--topbar-icon-btn-border)]
              text-[var(--topbar-icon-btn-color)]
              transition-[border,color] duration-150
              hover:border-[var(--topbar-icon-btn-hover-border)]
              hover:text-[var(--topbar-icon-btn-hover-color)]
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            onclick={openNotificationSidebar}
            class="
              relative flex h-11 w-11 items-center justify-center rounded-xl
              bg-[var(--topbar-icon-btn-bg)]
              border border-[var(--topbar-icon-btn-border)]
              text-[var(--topbar-icon-btn-color)]
              transition-[border,color] duration-150
              hover:border-[var(--topbar-icon-btn-hover-border)]
              hover:text-[var(--topbar-icon-btn-hover-color)]
            "
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M10 20a2 2 0 0 0 4 0"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
            {#if unreadNotificationCount > 0}
              <span
                class="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white"
              >
                {unreadNotificationCount}
              </span>
            {/if}
          </button>

          <div class="relative">
            <button
              type="button"
              onclick={toggleProfileDropdown}
              disabled={selectingMembershipDefault}
              class="
                flex w-[160px] items-center gap-2.5 rounded-xl px-3 py-2
                bg-[var(--topbar-profile-bg)]
                border border-[var(--topbar-profile-border)]
                transition-[border] duration-150
                hover:border-[var(--topbar-profile-hover-border)]
                disabled:pointer-events-none disabled:opacity-60
              "
            >
              {#if currentUser?.image}
                <img
                  src={currentUser.image}
                  alt="Profile"
                  class="h-8 w-8 rounded-lg object-cover"
                />
              {:else}
                <div
                  class="
                  flex h-8 w-8 items-center justify-center rounded-lg
                  bg-[var(--topbar-profile-avatar-bg)]
                  text-xs font-semibold text-[var(--topbar-profile-avatar-text)]
                "
                >
                  {getInitials(currentUser ?? undefined)}
                </div>
              {/if}

              <div class="hidden min-w-0 flex-1 text-left sm:block">
                <p
                  class="truncate text-sm font-semibold text-[var(--topbar-profile-name)]"
                >
                  {currentUser?.firstName ?? ""} {currentUser?.lastName ?? ""}
                </p>
                <p
                  class="truncate text-[11px] capitalize text-[var(--topbar-profile-role)]"
                >
                  {role}
                </p>
              </div>

              <span
                class="text-[var(--topbar-profile-chevron)] transition-transform duration-200 {profileDropdownOpen
                  ? 'rotate-180'
                  : ''}"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </button>

            {#if profileDropdownOpen}
              <button
                class="fixed inset-0 z-10 cursor-default bg-transparent"
                aria-label="Close dropdown"
                onclick={closeProfileDropdown}
              ></button>

              <div
                class="
                absolute right-0 z-20 mt-2.5 w-[300px] overflow-hidden rounded-2xl
                bg-[var(--topbar-dd-bg)]
                border border-[var(--topbar-dd-border)]
                shadow-[var(--topbar-dd-shadow)]
              "
              >
                <div
                  class="border-b border-[var(--topbar-dd-header-border)] px-4 py-3.5"
                >
                  <p
                    class="text-sm font-semibold text-[var(--topbar-dd-header-title)]"
                  >
                    Switch profile
                  </p>
                  <p class="mt-0.5 text-xs text-[var(--topbar-dd-header-sub)]">
                    Default profile is listed first. Subscription status in the
                    top bar uses your default profile.
                  </p>
                </div>
                <div
                  class="max-h-[240px] overflow-y-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {#if $authStore.users.length > 0}
                    {#each $authStore.users as user, index}
                      <button
                        type="button"
                        onclick={() => void selectUser(index)}
                        disabled={selectingMembershipDefault ||
                          isLoadingUsers ||
                          (!!user.defaultProfile ? false : !user.userProfileId)}
                        class="
                          flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left
                          transition-colors duration-150
                          {selectedUserIndex === index
                          ? 'bg-[var(--topbar-dd-item-selected-bg)]'
                          : 'hover:bg-[var(--topbar-dd-item-hover-bg)]'}
                          disabled:pointer-events-none disabled:opacity-60
                        "
                      >
                        {#if user.image}
                          <img
                            src={user.image}
                            alt="{user.firstName ?? 'User'} profile"
                            class="h-10 w-10 rounded-xl object-cover"
                          />
                        {:else}
                          <div
                            class="
                            flex h-10 w-10 items-center justify-center rounded-xl
                            bg-[var(--topbar-dd-avatar-bg)]
                            text-sm font-semibold text-[var(--topbar-dd-avatar-text)]
                          "
                          >
                            {getInitials(user)}
                          </div>
                        {/if}

                        <div class="min-w-0 flex-1">
                          <p
                            class="truncate text-sm font-semibold text-[var(--topbar-dd-item-name)]"
                          >
                            {user.firstName}
                            {user.lastName}
                          </p>
                          {#if user.defaultProfile}
                            <p
                              class="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--topbar-dd-header-sub)]"
                            >
                              Default
                            </p>
                          {/if}
                        </div>

                        {#if selectedUserIndex === index}
                          <span
                            class="text-[var(--topbar-dd-check)] flex-shrink-0"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                              />
                            </svg>
                          </span>
                        {/if}
                      </button>
                    {/each}
                  {:else}
                    <div
                      class="px-3 py-6 text-center text-sm text-[var(--topbar-dd-empty-text)]"
                    >
                      No users found in store
                    </div>
                  {/if}
                </div>
                <div
                  class="border-t border-[var(--topbar-dd-footer-border)] p-2 flex flex-col gap-1"
                >
                  <button
                    type="button"
                    onclick={goToCreateProfile}
                    class="
                      flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left
                      text-sm font-medium text-[var(--topbar-dd-action-text)]
                      transition-colors duration-150
                      hover:bg-[var(--topbar-dd-action-hover-bg)] hover:text-[var(--topbar-dd-action-hover-text)]
                    "
                  >
                    <span
                      class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--topbar-dd-action-icon-bg)] text-[var(--topbar-dd-action-icon-color)]"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 5v14M5 12h14"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </span>
                    <span>Create Profile</span>
                  </button>

                  <button
                    type="button"
                    onclick={handleLogout}
                    class="
                      flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left
                      text-sm font-medium text-[var(--topbar-dd-logout-text)]
                      transition-colors duration-150
                      hover:bg-[var(--topbar-dd-logout-hover-bg)]
                    "
                  >
                    <span
                      class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--topbar-dd-logout-icon-bg)] text-[var(--topbar-dd-logout-icon-color)]"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M15 16l4-4-4-4"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M9 12h10"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                        <path
                          d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"
                          stroke="currentColor"
                          stroke-width="1.8"
                          stroke-linecap="round"
                        />
                      </svg>
                    </span>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </header>
    <Notification
      open={notificationSidebarOpen}
      onClose={closeNotificationSidebar}
    />
    <main
      id="layout-main-scroll"
      class="min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--page-bg)] pt-[68px] {isTestAttemptRoute
        ? 'flex flex-col px-0 pb-0'
        : 'px-4 pb-24 md:px-6 md:pb-6'}"
    >
      {#key page.url.pathname}
        <div
          class={isTestAttemptRoute
            ? "flex min-h-0 flex-1 flex-col"
            : "min-h-0 p-0"}
        >
          {@render children?.()}
        </div>
      {/key}
    </main>
  </div>
</div>

{#if phoneModal.open}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
    <div class="w-full max-w-sm rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6 shadow-2xl">
      <h2 class="mb-1 text-base font-bold text-[var(--page-text)]">
        {phoneModal.step === 'input' ? (phoneModal.phone ? 'Verify Phone Number' : 'Add Phone Number') : 'Enter OTP'}
      </h2>
      <p class="mb-4 text-xs text-[var(--page-text-muted)]">
        {phoneModal.step === 'input' ? 'Add and verify your phone to secure your account.' : `OTP sent to ${phoneModal.phone}`}
      </p>

      {#if phoneModal.error}
        <p class="mb-3 rounded-lg bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">{phoneModal.error}</p>
      {/if}
      {#if phoneModal.success}
        <p class="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{phoneModal.success}</p>
      {/if}

      {#if phoneModal.step === 'input'}
        <input
          type="tel"
          bind:value={phoneModal.phone}
          placeholder="10-digit phone number"
          class="mb-4 w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:outline-none"
        />
        <div class="flex gap-2">
          <button onclick={() => { phoneModal.open = false; }} class="flex-1 rounded-xl border border-[var(--page-card-border)] py-2.5 text-sm font-semibold text-[var(--page-text-muted)] hover:bg-[var(--page-card-border)]/20 transition">Skip</button>
          <button onclick={phoneModalSendOtp} disabled={phoneModal.loading} class="flex-1 rounded-xl bg-[var(--page-link)] py-2.5 text-sm font-bold text-white disabled:opacity-50 transition">
            {phoneModal.loading ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      {:else}
        <input
          type="text"
          bind:value={phoneModal.otp}
          placeholder="Enter OTP"
          class="mb-4 w-full rounded-xl border border-[var(--page-card-border)] bg-[var(--page-bg)] px-4 py-2.5 text-sm text-[var(--page-text)] focus:border-[var(--page-link)] focus:outline-none"
        />
        <div class="flex gap-2">
          <button onclick={() => { phoneModal.step = 'input'; phoneModal.otp = ''; phoneModal.error = ''; }} class="flex-1 rounded-xl border border-[var(--page-card-border)] py-2.5 text-sm font-semibold text-[var(--page-text-muted)] hover:bg-[var(--page-card-border)]/20 transition">Back</button>
          <button onclick={phoneModalVerify} disabled={phoneModal.loading} class="flex-1 rounded-xl bg-[var(--page-link)] py-2.5 text-sm font-bold text-white disabled:opacity-50 transition">
            {phoneModal.loading ? 'Verifying…' : 'Verify'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Mobile Bottom Navigation -->
<nav
  class="
    fixed bottom-0 left-0 right-0 z-[100] flex h-16 items-center justify-around
    md:hidden px-4
    bg-[var(--topbar-bg)] border-t border-[var(--topbar-border)]
    shadow-[0_-4px_16px_rgba(0,0,0,0.06)]
    backdrop-blur-xl
  "
>
  {#each sidebarNavItems as navItem}
    {@const active = isActive(navItem.href)}
    <a
      href={navItem.href}
      class="
        relative flex flex-col items-center justify-center gap-1 min-w-[64px]
        transition-colors duration-200
        {active ? 'text-[var(--sb-nav-active-text)]' : 'text-[var(--sb-nav-text)]'}
      "
    >
      <div
        class="
        flex items-center justify-center w-8 h-8 rounded-lg
        transition-all duration-200
        {active ? 'bg-[var(--sb-nav-active-bg)] shadow-[var(--sb-nav-active-glow)]' : ''}
      "
      >
        <span class="flex items-center justify-center">
          {#if navItem.icon === "dashboard"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2" />
              <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" stroke-width="2" />
              <rect x="13" y="12" width="8" height="9" rx="2" stroke="currentColor" stroke-width="2" />
              <rect x="3" y="15" width="8" height="6" rx="2" stroke="currentColor" stroke-width="2" />
            </svg>
          {:else if navItem.icon === "exams"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="2" />
              <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          {:else if navItem.icon === "tests"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M9 12l2 2 4-4M16 3l2 2-6 6M18 5l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {:else if navItem.icon === "batch"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="2" />
              <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <circle cx="17" cy="7" r="2.25" stroke="currentColor" stroke-width="2" />
              <path d="M21 20c0-2.485-1.79-4.5-4-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          {:else if navItem.icon === "subscription"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            </svg>
          {/if}
        </span>
      </div>
      <span class="text-[10px] font-semibold tracking-tight">{navItem.label}</span>
      {#if active}
        <span class="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--sb-nav-active-indicator)]"></span>
      {:else}
        <span class="absolute -bottom-1 w-1 h-1 rounded-full bg-transparent"></span>
      {/if}
    </a>
  {/each}
</nav>
