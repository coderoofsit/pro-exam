<script lang="ts">
  import { authStore } from "$lib/stores/auth";
  import {
    fetchNotifications,
    type NotificationItem,
  } from "$lib/api/notifications";

  let {
    open = false,
    onClose = () => {},
  }: {
    open?: boolean;
    onClose?: () => void;
  } = $props();

  let notifications = $state<NotificationItem[]>([]);
  let isLoading = $state(false);
  let isLoadingMore = $state(false);
  let errorMessage = $state("");
  let hasLoadedOnce = $state(false);
  let currentPage = $state(0);
  let totalPages = $state(1);
  let hasMore = $derived(currentPage < totalPages);
  let listContainerRef = $state<HTMLDivElement | null>(null);

  function getSenderName(item: NotificationItem): string {
    const first = item.senderId?.firstName?.trim() ?? "";
    const last = item.senderId?.lastName?.trim() ?? "";
    return `${first} ${last}`.trim() || "Unknown sender";
  }

  function formatNotificationDate(isoDate?: string): string {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  async function loadNotifications(pageToLoad: number) {
    if (isLoading || isLoadingMore) return;
    if (pageToLoad > totalPages && hasLoadedOnce) return;

    const isInitialLoad = pageToLoad === 1;
    if (isInitialLoad) {
      isLoading = true;
    } else {
      isLoadingMore = true;
    }
    errorMessage = "";

    try {
      const response = await fetchNotifications(
        { page: pageToLoad, limit: 10 },
        undefined,
        { token: $authStore.token },
      );

      if (!response.success) {
        notifications = [];
        errorMessage = response.message || "Failed to load notifications.";
        return;
      }

      const body = response.data;
      if (!body?.success) {
        if (isInitialLoad) notifications = [];
        errorMessage = body?.message || "Failed to load notifications.";
        return;
      }

      const items = Array.isArray(body.data?.items) ? body.data.items : [];
      const receivedPage = Number(body.data?.page) || pageToLoad;
      const receivedTotalPages = Math.max(1, Number(body.data?.totalPages) || 1);

      totalPages = receivedTotalPages;
      currentPage = receivedPage;
      if (isInitialLoad) {
        notifications = items;
      } else {
        const unique = new Map(notifications.map((item) => [item._id, item]));
        for (const item of items) {
          unique.set(item._id, item);
        }
        notifications = Array.from(unique.values());
      }
      hasLoadedOnce = true;
    } catch (error) {
      if (isInitialLoad) notifications = [];
      errorMessage =
        error instanceof Error ? error.message : "Failed to load notifications.";
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  function handleNotificationScroll() {
    if (!open || isLoading || isLoadingMore || !hasMore || !listContainerRef) return;
    const remaining =
      listContainerRef.scrollHeight -
      listContainerRef.scrollTop -
      listContainerRef.clientHeight;
    if (remaining <= 96) {
      void loadNotifications(currentPage + 1);
    }
  }

  $effect(() => {
    if (!open) return;
    if (hasLoadedOnce || isLoading || isLoadingMore) return;
    void loadNotifications(1);
  });
</script>

<div
  class="fixed inset-0 z-40 transition-opacity duration-300 {open
    ? 'pointer-events-auto bg-black/30 opacity-100'
    : 'pointer-events-none bg-black/0 opacity-0'}"
>
  <button
    type="button"
    aria-label="Close notifications sidebar"
    class="absolute inset-0 cursor-default bg-transparent"
    onclick={onClose}
  ></button>

  <aside
    class="absolute right-0 top-0 h-full w-full max-w-md border-l border-[var(--topbar-border)] bg-[var(--page-bg)] shadow-[-8px_0_30px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out {open
      ? 'translate-x-0'
      : 'translate-x-full'}"
  >
    <div class="flex h-16 items-center justify-between border-b border-[var(--topbar-border)] px-5">
      <h2 class="text-base font-semibold text-[var(--page-text)]">Notifications</h2>
      <button
        type="button"
        aria-label="Close notifications"
        title="Close"
        onclick={onClose}
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--topbar-icon-btn-border)] bg-[var(--topbar-icon-btn-bg)] text-[var(--topbar-icon-btn-color)] transition-colors duration-150 hover:border-[var(--topbar-icon-btn-hover-border)] hover:text-[var(--topbar-icon-btn-hover-color)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <div
      bind:this={listContainerRef}
      onscroll={handleNotificationScroll}
      class="h-[calc(100%-4rem)] overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:var(--topbar-search-border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--topbar-search-border)] [&::-webkit-scrollbar-button]:hidden"
    >
      {#if isLoading}
        <div class="rounded-2xl border border-[var(--topbar-search-border)] bg-[var(--topbar-search-bg)] p-4 text-sm text-[var(--topbar-search-placeholder)]">
          Loading notifications...
        </div>
      {:else if errorMessage}
        <div class="rounded-2xl border border-[var(--topbar-search-border)] bg-[var(--topbar-search-bg)] p-4 text-sm text-red-500">
          {errorMessage}
        </div>
      {:else if notifications.length === 0}
        <div class="rounded-2xl border border-[var(--topbar-search-border)] bg-[var(--topbar-search-bg)] p-4 text-sm text-[var(--topbar-search-placeholder)]">
          {hasLoadedOnce
            ? "No notifications available."
            : "Notifications will appear here once available."}
        </div>
      {:else}
        <div class="divide-y divide-[var(--topbar-border)] overflow-hidden rounded-2xl border border-[var(--topbar-border)] bg-[var(--topbar-search-bg)]">
          {#each notifications as item (item._id)}
            <article
              class="border-l-2 px-4 py-4 transition-colors duration-200 {item.isRead
                ? 'border-l-transparent bg-transparent'
                : 'border-l-[var(--topbar-notif-dot)] bg-[color:var(--topbar-search-ring-focus)]/30'}"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-sm text-[var(--page-text)] {item.isRead ? 'font-semibold' : 'font-bold'}">
                    {item.title}
                  </h3>
                </div>
                <span class="flex-shrink-0 text-[11px] text-[var(--topbar-search-placeholder)]">
                  {formatNotificationDate(item.createdDateIst)}
                </span>
              </div>

              <p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--topbar-search-placeholder)]">
                {item.subType}
              </p>
              <p class="mt-2 text-sm leading-6 text-[var(--page-text)]">
                {item.message}
              </p>
              <p class="mt-2 text-xs {item.isRead ? 'font-medium text-[var(--topbar-search-placeholder)]' : 'font-semibold text-[var(--page-text)]'}">
                {getSenderName(item)}
              </p>
            </article>
          {/each}

          {#if isLoadingMore}
            <div
              class="px-4 py-4"
            >
              <div class="h-3 w-2/3 animate-pulse rounded bg-[var(--topbar-search-border)]"></div>
              <div class="mt-2 h-3 w-5/6 animate-pulse rounded bg-[var(--topbar-search-border)]"></div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </aside>
</div>
