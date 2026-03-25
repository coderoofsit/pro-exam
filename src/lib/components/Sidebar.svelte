<!-- <script lang="ts">
  import { page } from '$app/state';

  type Role = 'student' | 'tutor' | 'institute';
  type SidebarIcon = 'dashboard' | 'exams' | 'tests' | 'batch' | 'subscription';

  type SidebarItem = {
    id: string;
    label: string;
    href: string;
    icon: SidebarIcon;
  };

  let { role }: { role: Role } = $props();

  let sidebarCollapsed = $state(false);

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  const navItemsByRole: Record<Role, SidebarItem[]> = {
    student: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/student/dashboard',      icon: 'dashboard'    },
      { id: 'sidebar-exams',        label: 'Exams',        href: '/student/exams',          icon: 'exams'        },
      { id: 'sidebar-tests',        label: 'Tests',        href: '/student/tests',          icon: 'tests'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/student/subscription',   icon: 'subscription' }
    ],
    tutor: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/tutor/dashboard',        icon: 'dashboard'    },
      { id: 'sidebar-tests',        label: 'Tests',        href: '/tutor/tests',            icon: 'tests'        },
      { id: 'sidebar-batch',        label: 'Batch',        href: '/tutor/batch',            icon: 'batch'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/tutor/subscription',     icon: 'subscription' }
    ],
    institute: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/institute/dashboard',    icon: 'dashboard'    },
      { id: 'sidebar-exams',        label: 'Exams',        href: '/institute/exams',        icon: 'exams'        },
      { id: 'sidebar-batch',        label: 'Batch',        href: '/institute/batch',        icon: 'batch'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/institute/subscription', icon: 'subscription' }
    ]
  };

  function isActive(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
  }

  const sidebarNavItems = navItemsByRole[role];
</script>

<aside
  class="
    relative flex flex-col h-svh overflow-hidden
    border-r border-[var(--sb-border-color)]
    shadow-[4px_0_32px_rgba(5,7,13,0.6)]
    bg-[linear-gradient(160deg,var(--sb-bg-from)_0%,var(--sb-bg-to)_100%)]
    transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
    before:absolute before:inset-x-0 before:top-0 before:h-px
    before:bg-[linear-gradient(90deg,transparent,var(--sb-edge-glow),transparent)]
    before:pointer-events-none
    {sidebarCollapsed ? 'w-[var(--sb-width-collapsed)]' : 'w-[var(--sb-width-expanded)]'}
  "
>

  <div class="flex items-center gap-3 px-4 py-[18px] min-h-[68px] border-b border-[var(--sb-divider)] flex-shrink-0">

    <div class="
      flex-shrink-0 w-9 h-9 rounded-[10px]
      flex items-center justify-center
      bg-[linear-gradient(135deg,var(--sb-logo-gradient-from),var(--sb-logo-gradient-to))]
      shadow-[var(--sb-logo-glow)]
      transition-shadow duration-200
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"      stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 7v4l1.5-1L12 11V7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    {#if !sidebarCollapsed}
      <div class="flex flex-col min-w-0 overflow-hidden">
        <span class="
          block whitespace-nowrap overflow-hidden text-ellipsis tracking-tight
          text-[length:var(--sb-font-size-brand)] font-[var(--sb-font-brand)]
          text-[var(--sb-brand-name-color)]
        ">
          ExamFlow
        </span>
        <span class="
          block mt-px capitalize tracking-[0.04em]
          text-[length:var(--sb-font-size-role)] font-medium
          text-[var(--sb-brand-role-color)]
        ">
          {role} Panel
        </span>
      </div>
    {/if}
  </div>

  <nav
    class="flex-1 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    aria-label="Sidebar navigation"
  >
    {#each sidebarNavItems as navItem}
      {@const active = isActive(navItem.href)}
      <a
        id={navItem.id}
        href={navItem.href}
        title={sidebarCollapsed ? navItem.label : undefined}
        aria-current={active ? 'page' : undefined}
        class="
          relative flex items-center gap-3
          px-3 py-2.5 rounded-xl no-underline whitespace-nowrap
          text-[length:var(--sb-font-size-nav)] font-[var(--sb-font-nav)]
          transition-[background,color,box-shadow] duration-150
          {active
            ? 'bg-[var(--sb-nav-active-bg)] text-[var(--sb-nav-active-text)] shadow-[var(--sb-nav-active-glow)]'
            : 'text-[var(--sb-nav-text)] hover:bg-[var(--sb-nav-hover-bg)] hover:text-[var(--sb-nav-hover-text)]'}
        "
      >

        {#if active}
          <span class="
            absolute left-0 top-1/2 -translate-y-1/2
            w-[3px] h-5 rounded-r-full
            bg-[var(--sb-nav-active-indicator)]
            shadow-[0_0_8px_var(--sb-nav-active-indicator)]
          "></span>
        {/if}

        <span class="
          flex-shrink-0 w-5 h-5 flex items-center justify-center
          {active ? 'text-[var(--sb-nav-active-icon)]' : 'text-[var(--sb-nav-icon)]'}
        ">
          {#if navItem.icon === 'dashboard'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3"  y="3"  width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="13" y="3"  width="8" height="5" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="13" y="12" width="8" height="9" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="3"  y="15" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.75"/>
            </svg>
          {:else if navItem.icon === 'exams'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/>
              <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          {:else if navItem.icon === 'tests'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              <path d="M9 12l2 2 4-4"  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 3l2 2-6 6"  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 5l2-2"       stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          {:else if navItem.icon === 'batch'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="9"  cy="7"  r="3"    stroke="currentColor" stroke-width="1.75"/>
              <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              <circle cx="17" cy="7"  r="2.25" stroke="currentColor" stroke-width="1.75"/>
              <path d="M21 20c0-2.485-1.79-4.5-4-4.5"         stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          {:else if navItem.icon === 'subscription'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
            </svg>
          {/if}
        </span>

        {#if !sidebarCollapsed}
          <span class="overflow-hidden text-ellipsis">{navItem.label}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="px-2.5 py-2.5 border-t border-[var(--sb-divider)] flex-shrink-0">
    <button
      onclick={toggleSidebar}
      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!sidebarCollapsed}
      class="
        w-full flex items-center gap-3
        px-3 py-2.5 rounded-xl
        border-none bg-transparent cursor-pointer
        text-[length:var(--sb-font-size-collapse)] font-medium tracking-[0.08em] uppercase
        text-[var(--sb-collapse-text)]
        transition-[background,color] duration-150
        hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]
      "
    >
      <span class="
        flex-shrink-0 w-5 h-5 flex items-center justify-center
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        {sidebarCollapsed ? 'rotate-180' : ''}
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>

      {#if !sidebarCollapsed}
        <span class="whitespace-nowrap">Collapse</span>
      {/if}
    </button>
  </div>

</aside> -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { authStore, type AuthUser } from '$lib/stores/auth';
  import { type ThemeMode, toggleThemeMode } from '$lib/theme';

  type Role = 'student' | 'tutor' | 'institute';
  type SidebarIcon = 'dashboard' | 'exams' | 'tests' | 'batch' | 'subscription';

  type SidebarItem = {
    id: string;
    label: string;
    href: string;
    icon: SidebarIcon;
  };

  let { role, children }: { role: Role; children?: import('svelte').Snippet } = $props();

  let sidebarCollapsed = $state(false);
  let profileDropdownOpen = $state(false);
  let selectedUserIndex = $state(0);
  let searchValue = $state('');
  let themeMode = $state<ThemeMode>('dark');

  function toggleSidebar() { sidebarCollapsed = !sidebarCollapsed; }
  function toggleProfileDropdown() { profileDropdownOpen = !profileDropdownOpen; }
  function closeProfileDropdown() { profileDropdownOpen = false; }

  const navItemsByRole: Record<Role, SidebarItem[]> = {
    student: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/student/dashboard',      icon: 'dashboard'    },
      { id: 'sidebar-exams',        label: 'Exams',        href: '/student/exams',          icon: 'exams'        },
      { id: 'sidebar-tests',        label: 'Tests',        href: '/student/tests',          icon: 'tests'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/student/subscription',   icon: 'subscription' }
    ],
    tutor: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/tutor/dashboard',        icon: 'dashboard'    },
      { id: 'sidebar-tests',        label: 'Tests',        href: '/tutor/tests',            icon: 'tests'        },
      { id: 'sidebar-batch',        label: 'Batch',        href: '/tutor/batch',            icon: 'batch'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/tutor/subscription',     icon: 'subscription' }
    ],
    institute: [
      { id: 'sidebar-dashboard',    label: 'Dashboard',    href: '/institute/dashboard',    icon: 'dashboard'    },
      { id: 'sidebar-exams',        label: 'Exams',        href: '/institute/exams',        icon: 'exams'        },
      { id: 'sidebar-batch',        label: 'Batch',        href: '/institute/batch',        icon: 'batch'        },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/institute/subscription', icon: 'subscription' }
    ]
  };

  const sidebarNavItems = $derived(navItemsByRole[role]);

  function isActive(href: string): boolean {
    return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
  }

  function getInitials(user?: AuthUser) {
    if (!user) return 'U';
    const first = user.firstName?.[0] ?? '';
    const last  = user.lastName?.[0]  ?? '';
    return `${first}${last}`.trim() || 'U';
  }

  function selectUser(index: number) {
    selectedUserIndex = index;
    profileDropdownOpen = false;
  }

  async function handleLogout() {
    authStore.logout();
    profileDropdownOpen = false;
    await goto('/login');
  }

  async function goToCreateProfile() {
    profileDropdownOpen = false;
    await goto('/profile/create');
  }

  const currentUser = $derived($authStore.users[selectedUserIndex] ?? $authStore.users[0] ?? null);

  $effect(() => {
    if ($authStore.users.length === 0) { selectedUserIndex = 0; return; }
    if (selectedUserIndex > $authStore.users.length - 1) selectedUserIndex = 0;
  });

  onMount(() => {
    const t = document.documentElement.dataset.theme;
    themeMode = t === 'light' || t === 'dark' ? t : 'dark';
  });

  function onToggleTheme() {
    themeMode = toggleThemeMode(themeMode);
  }
</script>

<!-- ── Root layout: h-dvh constrains to viewport so main content scrolls ── -->
<div class="flex h-dvh min-h-0 bg-[var(--page-bg)] font-sans text-[var(--page-text)]">

  <!-- ════════════════════════════════════════
       SIDEBAR
  ════════════════════════════════════════ -->
  <aside class="
    relative flex h-dvh flex-shrink-0 flex-col overflow-hidden
    border-r border-[var(--sb-border-color)]
    bg-[linear-gradient(160deg,var(--sb-bg-from)_0%,var(--sb-bg-to)_100%)]
    shadow-[4px_0_32px_rgba(5,7,13,0.6)]
    transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
    before:absolute before:inset-x-0 before:top-0 before:h-px before:pointer-events-none
    before:bg-[linear-gradient(90deg,transparent,var(--sb-edge-glow),transparent)]
    {sidebarCollapsed ? 'w-[var(--sb-width-collapsed)]' : 'w-[var(--sb-width-expanded)]'}
  ">

    <!-- Header / brand -->
    <div class="flex items-center gap-3 px-4 py-[18px] min-h-[68px] border-b border-[var(--sb-divider)] flex-shrink-0">
      <div class="
        flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center
        bg-[linear-gradient(135deg,var(--sb-logo-gradient-from),var(--sb-logo-gradient-to))]
        shadow-[var(--sb-logo-glow)] transition-shadow duration-200
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"      stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M9 7v4l1.5-1L12 11V7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      {#if !sidebarCollapsed}
        <div class="flex flex-col min-w-0 overflow-hidden">
          <span class="
            block whitespace-nowrap overflow-hidden text-ellipsis tracking-tight
            text-[length:var(--sb-font-size-brand)] font-[var(--sb-font-brand)]
            text-[var(--sb-brand-name-color)]
          ">ExamFlow</span>
          <span class="
            block mt-px capitalize tracking-[0.04em]
            text-[length:var(--sb-font-size-role)] font-medium
            text-[var(--sb-brand-role-color)]
          ">{role} Panel</span>
        </div>
      {/if}
    </div>

    <!-- Nav -->
    <nav class="flex-1 min-h-0 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {#each sidebarNavItems as navItem}
        {@const active = isActive(navItem.href)}
        <a
          id={navItem.id}
          href={navItem.href}
          title={sidebarCollapsed ? navItem.label : undefined}
          aria-current={active ? 'page' : undefined}
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
            <span class="
              absolute left-0 top-1/2 -translate-y-1/2
              w-[3px] h-5 rounded-r-full
              bg-[var(--sb-nav-active-indicator)]
              shadow-[0_0_8px_var(--sb-nav-active-indicator)]
            "></span>
          {/if}

          <span class="
            flex-shrink-0 w-5 h-5 flex items-center justify-center
            {active ? 'text-[var(--sb-nav-active-icon)]' : 'text-[var(--sb-nav-icon)]'}
          ">
            {#if navItem.icon === 'dashboard'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3"  y="3"  width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.75"/>
                <rect x="13" y="3"  width="8" height="5" rx="2" stroke="currentColor" stroke-width="1.75"/>
                <rect x="13" y="12" width="8" height="9" rx="2" stroke="currentColor" stroke-width="1.75"/>
                <rect x="3"  y="15" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.75"/>
              </svg>
            {:else if navItem.icon === 'exams'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                <rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/>
                <path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            {:else if navItem.icon === 'tests'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                <path d="M9 12l2 2 4-4"  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 3l2 2-6 6"  stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18 5l2-2"       stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            {:else if navItem.icon === 'batch'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="9"  cy="7"  r="3"    stroke="currentColor" stroke-width="1.75"/>
                <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
                <circle cx="17" cy="7"  r="2.25" stroke="currentColor" stroke-width="1.75"/>
                <path d="M21 20c0-2.485-1.79-4.5-4-4.5"         stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              </svg>
            {:else if navItem.icon === 'subscription'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
              </svg>
            {/if}
          </span>

          {#if !sidebarCollapsed}
            <span class="overflow-hidden text-ellipsis">{navItem.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- Collapse toggle -->
    <div class="px-2.5 py-2.5 border-t border-[var(--sb-divider)] flex-shrink-0">
      <button
        onclick={toggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
        class="
          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
          border-none bg-transparent cursor-pointer
          text-[length:var(--sb-font-size-collapse)] font-medium tracking-[0.08em] uppercase
          text-[var(--sb-collapse-text)]
          transition-[background,color] duration-150
          hover:bg-[var(--sb-collapse-hover-bg)] hover:text-[var(--sb-collapse-hover-text)]
        "
      >
        <span class="
          flex-shrink-0 w-5 h-5 flex items-center justify-center
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          {sidebarCollapsed ? 'rotate-180' : ''}
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        {#if !sidebarCollapsed}
          <span class="whitespace-nowrap">Collapse</span>
        {/if}
      </button>
    </div>
  </aside>

  <!-- ════════════════════════════════════════
       MAIN COLUMN (topbar + content)
  ════════════════════════════════════════ -->
  <div class="flex min-h-0 min-w-0 flex-1 flex-col">

    <!-- ── Topbar ── -->
    <header class="
      sticky top-0 z-30 flex-shrink-0
      px-6 py-3
      bg-[var(--topbar-bg)]
      border-b border-[var(--topbar-border)]
      shadow-[var(--topbar-shadow)]
      backdrop-blur-md
    ">
      <div class="flex items-center justify-between gap-4">

        <!-- Search -->
        <div class="relative w-full max-w-[560px]">
          <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--topbar-search-icon)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/>
              <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>
          <input
            bind:value={searchValue}
            type="text"
            placeholder="Search exams, tests, subscriptions..."
            class="
              h-11 w-full rounded-xl pl-11 pr-4 text-sm outline-none
              bg-[var(--topbar-search-bg)]
              border border-[var(--topbar-search-border)]
              text-[var(--topbar-search-text)]
              placeholder:text-[var(--topbar-search-placeholder)]
              transition-[border,box-shadow] duration-150
              focus:border-[var(--topbar-search-border-focus)]
              focus:ring-4 focus:ring-[var(--topbar-search-ring-focus)]
            "
          />
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-2.5 flex-shrink-0">

          <!-- Theme: light / dark -->
          <button
            type="button"
            onclick={onToggleTheme}
            title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
            {#if themeMode === 'dark'}
              <!-- Sun -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            {:else}
              <!-- Moon -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 6.5 6.5 0 0 0 21 14.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {/if}
          </button>

          <!-- Bell -->
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
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
              <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span class="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--topbar-notif-dot)]"></span>
          </button>

          <!-- Profile trigger -->
          <div class="relative">
            <button
              type="button"
              onclick={toggleProfileDropdown}
              class="
                flex items-center gap-2.5 rounded-xl px-3 py-2
                bg-[var(--topbar-profile-bg)]
                border border-[var(--topbar-profile-border)]
                transition-[border] duration-150
                hover:border-[var(--topbar-profile-hover-border)]
              "
            >
              {#if currentUser?.image}
                <img src={currentUser.image} alt="Profile" class="h-8 w-8 rounded-lg object-cover"/>
              {:else}
                <div class="
                  flex h-8 w-8 items-center justify-center rounded-lg
                  bg-[var(--topbar-profile-avatar-bg)]
                  text-xs font-semibold text-[var(--topbar-profile-avatar-text)]
                ">
                  {getInitials(currentUser ?? undefined)}
                </div>
              {/if}

              <div class="hidden text-left sm:block">
                <p class="max-w-[130px] truncate text-sm font-semibold text-[var(--topbar-profile-name)]">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p class="text-[11px] capitalize text-[var(--topbar-profile-role)]">{role}</p>
              </div>

              <span class="text-[var(--topbar-profile-chevron)] transition-transform duration-200 {profileDropdownOpen ? 'rotate-180' : ''}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </button>

            <!-- Dropdown -->
            {#if profileDropdownOpen}
              <!-- Backdrop -->
              <button
                class="fixed inset-0 z-10 cursor-default bg-transparent"
                aria-label="Close dropdown"
                onclick={closeProfileDropdown}
              ></button>

              <div class="
                absolute right-0 z-20 mt-2.5 w-[300px] overflow-hidden rounded-2xl
                bg-[var(--topbar-dd-bg)]
                border border-[var(--topbar-dd-border)]
                shadow-[var(--topbar-dd-shadow)]
              ">
                <!-- Dropdown header -->
                <div class="border-b border-[var(--topbar-dd-header-border)] px-4 py-3.5">
                  <p class="text-sm font-semibold text-[var(--topbar-dd-header-title)]">Switch user</p>
                  <p class="mt-0.5 text-xs text-[var(--topbar-dd-header-sub)]">Choose a user from auth store</p>
                </div>

                <!-- User list -->
                <div class="max-h-[240px] overflow-y-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {#if $authStore.users.length > 0}
                    {#each $authStore.users as user, index}
                      <button
                        type="button"
                        onclick={() => selectUser(index)}
                        class="
                          flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left
                          transition-colors duration-150
                          {selectedUserIndex === index
                            ? 'bg-[var(--topbar-dd-item-selected-bg)]'
                            : 'hover:bg-[var(--topbar-dd-item-hover-bg)]'}
                        "
                      >
                        {#if user.image}
                          <img src={user.image} alt="{user.firstName ?? 'User'} profile" class="h-10 w-10 rounded-xl object-cover"/>
                        {:else}
                          <div class="
                            flex h-10 w-10 items-center justify-center rounded-xl
                            bg-[var(--topbar-dd-avatar-bg)]
                            text-sm font-semibold text-[var(--topbar-dd-avatar-text)]
                          ">
                            {getInitials(user)}
                          </div>
                        {/if}

                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-semibold text-[var(--topbar-dd-item-name)]">
                            {user.firstName} {user.lastName}
                          </p>
                          <p class="truncate text-xs text-[var(--topbar-dd-item-sub)]">{user._id}</p>
                        </div>

                        {#if selectedUserIndex === index}
                          <span class="text-[var(--topbar-dd-check)] flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </span>
                        {/if}
                      </button>
                    {/each}
                  {:else}
                    <div class="px-3 py-6 text-center text-sm text-[var(--topbar-dd-empty-text)]">
                      No users found in store
                    </div>
                  {/if}
                </div>

                <!-- Footer actions -->
                <div class="border-t border-[var(--topbar-dd-footer-border)] p-2 flex flex-col gap-1">
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
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--topbar-dd-action-icon-bg)] text-[var(--topbar-dd-action-icon-color)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
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
                    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--topbar-dd-logout-icon-bg)] text-[var(--topbar-dd-logout-icon-color)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M15 16l4-4-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
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

    <!-- ── Page content: pt-0 on scroll root so content cannot paint into a fixed top padding band; pt-6 is on the inner wrapper so it scrolls with the page. ── -->
    <main id="layout-main-scroll" class="min-h-0 min-w-0 flex-1 overflow-auto bg-[var(--page-bg)] px-6 pb-6 pt-0">
      {#key page.url.pathname}
        <div class="min-h-0 pt-6">
          {@render children?.()}
        </div>
      {/key}
    </main>
  </div>
</div>