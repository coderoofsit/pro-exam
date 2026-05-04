<script lang="ts">
  type PaginationItem =
    | { type: 'page'; page: number }
    | { type: 'ellipsis'; key: string; targetPage: number };

  type Props = {
    currentPage: number;
    totalPages: number;
    getHref: (page: number) => string;
    keyPrefix?: string;
    className?: string;
    windowSize?: number;
    prevLabel?: string;
    nextLabel?: string;
  };

  let {
    currentPage,
    totalPages,
    getHref,
    keyPrefix = 'pagination',
    className = '',
    windowSize = 2,
    prevLabel = 'Prev',
    nextLabel = 'Next'
  }: Props = $props();

  const items = $derived.by((): PaginationItem[] => {
    if (totalPages <= 1) return [];

    const last = totalPages;
    const current = Math.min(Math.max(1, currentPage), last);
    const sibling = Math.max(1, windowSize - 1);
    const out: PaginationItem[] = [];

    const pushPage = (page: number) => out.push({ type: 'page', page });
    const pushRange = (start: number, end: number) => {
      for (let p = start; p <= end; p += 1) pushPage(p);
    };

    if (last <= 7) {
      pushRange(1, last);
      return out;
    }

    pushPage(1);
    const leftGap = current - sibling > 2;
    const rightGap = current + sibling < last - 1;

    if (!leftGap && rightGap) {
      pushRange(2, Math.min(last - 1, 2 + sibling * 2));
      out.push({
        type: 'ellipsis',
        key: 'right',
        targetPage: Math.min(last - 1, current + sibling * 2 + 2)
      });
    } else if (leftGap && !rightGap) {
      out.push({
        type: 'ellipsis',
        key: 'left',
        targetPage: Math.max(2, current - sibling * 2 - 2)
      });
      pushRange(Math.max(2, last - (sibling * 2 + 1)), last - 1);
    } else if (leftGap && rightGap) {
      out.push({
        type: 'ellipsis',
        key: 'left',
        targetPage: Math.max(2, current - sibling - 1)
      });
      pushRange(current - sibling, current + sibling);
      out.push({
        type: 'ellipsis',
        key: 'right',
        targetPage: Math.min(last - 1, current + sibling + 1)
      });
    }

    pushPage(last);
    return out;
  });
</script>

{#if totalPages > 1}
  <div class={`flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 ${className}`}>
    {#if currentPage > 1}
      <a class="pagination-btn max-sm:!bg-transparent max-sm:!border-transparent max-sm:!shadow-none max-sm:!px-2 max-sm:!text-[13px]" href={getHref(currentPage - 1)}>
        <span class="sm:hidden">&lt;</span>
        <span class="hidden sm:inline">{prevLabel}</span>
      </a>
    {/if}

    {#each items as item (`${keyPrefix}-${item.type}-${item.type === 'page' ? item.page : item.key}`)}
      {#if item.type === 'page'}
        <a class={`pagination-btn max-sm:!border-transparent max-sm:!shadow-none max-sm:!text-[12px] sm:px-3.5 ${item.page === currentPage ? 'page-link-active max-sm:!bg-[var(--page-link)] max-sm:!text-white max-sm:!rounded-full max-sm:!w-[26px] max-sm:!h-[26px] max-sm:!p-0 max-sm:!font-bold' : 'max-sm:!bg-transparent max-sm:!bg-none max-sm:!px-1.5'}`} href={getHref(item.page)}>
          {item.page}
        </a>
      {:else}
        <a class="pagination-btn max-sm:!bg-transparent max-sm:!border-transparent max-sm:!shadow-none max-sm:!px-1 max-sm:!text-[12px] sm:px-3.5" href={getHref(item.targetPage)} aria-label="Jump pages">
          ...
        </a>
      {/if}
    {/each}

    {#if currentPage < totalPages}
      <a class="pagination-btn max-sm:!bg-transparent max-sm:!border-transparent max-sm:!shadow-none max-sm:!px-2 max-sm:!text-[13px]" href={getHref(currentPage + 1)}>
        <span class="sm:hidden">&gt;</span>
        <span class="hidden sm:inline">{nextLabel}</span>
      </a>
    {/if}
  </div>
{/if}
