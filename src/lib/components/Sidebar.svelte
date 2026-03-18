<script lang="ts">
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
      { id: 'sidebar-dashboard', label: 'Dashboard', href: '/student/dashboard', icon: 'dashboard' },
      { id: 'sidebar-exams', label: 'Exams', href: '/student/exams', icon: 'exams' },
      { id: 'sidebar-tests', label: 'Tests', href: '/student/tests', icon: 'tests' },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/student/subscription', icon: 'subscription' }
    ],
    tutor: [
      { id: 'sidebar-dashboard', label: 'Dashboard', href: '/tutor/dashboard', icon: 'dashboard' },
      { id: 'sidebar-tests', label: 'Tests', href: '/tutor/tests', icon: 'tests' },
      { id: 'sidebar-batch', label: 'Batch', href: '/tutor/batch', icon: 'batch' },
      { id: 'sidebar-subscription', label: 'Subscription', href: '/tutor/subscription', icon: 'subscription' }
    ],
    institute: [
      { id: 'sidebar-dashboard', label: 'Dashboard', href: '/institute/dashboard', icon: 'dashboard' },
      { id: 'sidebar-exams', label: 'Exams', href: '/institute/exams', icon: 'exams' },
      { id: 'sidebar-batch', label: 'Batch', href: '/institute/batch', icon: 'batch' },
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
    flex flex-col h-screen overflow-hidden
    bg-surface-card border-r border-surface-border shadow-card
    transition-[width] duration-300 ease-in-out
    {sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'}
  "
>
  <div class="flex items-center gap-3 px-4 py-5 min-h-[68px] border-b border-surface-border">
    <div class="flex-shrink-0 w-9 h-9 rounded-[10px] bg-content-primary flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M9 7v4l1.5-1L12 11V7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    {#if !sidebarCollapsed}
      <div class="min-w-0">
        <span class="block text-base font-bold text-content-primary tracking-tight whitespace-nowrap overflow-hidden">
          ExamFlow
        </span>
        <span class="block text-xs text-content-secondary capitalize">
          {role} Panel
        </span>
      </div>
    {/if}
  </div>

  <nav class="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {#each sidebarNavItems as navItem}
      {@const active = isActive(navItem.href)}
      <a
        id={navItem.id}
        href={navItem.href}
        title={sidebarCollapsed ? navItem.label : undefined}
        class="
          relative flex items-center gap-3
          px-3 py-2.5 rounded-item
          text-sm font-medium no-underline whitespace-nowrap
          transition-colors duration-150
          {active
            ? 'bg-brand-primary-light text-brand-primary'
            : 'text-content-secondary hover:bg-surface-subtle hover:text-content-primary'}
        "
      >
        {#if active}
          <span class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-primary"></span>
        {/if}

        <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {#if navItem.icon === 'dashboard'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="13" y="12" width="8" height="9" rx="2" stroke="currentColor" stroke-width="1.75"/>
              <rect x="3" y="15" width="8" height="6" rx="2" stroke="currentColor" stroke-width="1.75"/>
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
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 3l2 2-6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 5l2-2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
          {:else if navItem.icon === 'batch'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="1.75"/>
              <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              <circle cx="17" cy="7" r="2.25" stroke="currentColor" stroke-width="1.75"/>
              <path d="M21 20c0-2.485-1.79-4.5-4-4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
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

  <div class="px-3 py-3 border-t border-surface-border">
    <button
      onclick={toggleSidebar}
      title={sidebarCollapsed ? 'Expand' : 'Collapse'}
      class="
        w-full flex items-center gap-3
        px-3 py-2.5 rounded-item
        border-none bg-transparent cursor-pointer
        text-content-muted
        transition-colors duration-150
        hover:bg-surface-subtle hover:text-content-secondary
      "
    >
      <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-300 {sidebarCollapsed ? 'rotate-180' : ''}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>

      {#if !sidebarCollapsed}
        <span class="text-xs font-medium whitespace-nowrap">Collapse</span>
      {/if}
    </button>
  </div>
</aside>