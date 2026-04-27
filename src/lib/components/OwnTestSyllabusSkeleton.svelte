<script lang="ts">
</script>

<div class="syllabus-skeleton animate-pulse" aria-hidden="true">
  <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
    <!-- Sidebar Skeleton -->
    <aside class="flex w-full shrink-0 flex-col gap-3 lg:w-[260px]">
      {#each Array(4) as _}
        <div class="h-20 w-full rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
      {/each}
    </aside>

    <!-- Content Skeleton -->
    <div class="flex-1 space-y-4">
      <div class="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800 mb-6"></div>
      {#each Array(6) as _}
        <div class="h-16 w-full rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
      {/each}
    </div>
  </div>
</div>

<style>
  .animate-pulse {
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.8;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
