<script lang="ts">
  import type { StudentBatchItem } from '$lib/api/batch';

  type Props = {
    batch: StudentBatchItem;
  };

  let { batch }: Props = $props();

  function initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'B';
  }

  const creatorName = $derived(
    `${batch.createdByUser?.firstName ?? ''} ${batch.createdByUser?.lastName ?? ''}`.trim() ||
      '—'
  );

  const statusKey = $derived(batch.status?.toLowerCase() ?? '');

  const detailHref = $derived(`/student/batch/${encodeURIComponent(batch._id)}`);
</script>

<a
  href={detailHref}
  class="
    student-batch-card
    group relative flex flex-col justify-between overflow-hidden
    rounded-2xl p-4 min-h-[132px]
    bg-[var(--sh-exam-card-bg)]
    border border-[var(--sh-exam-card-border)]
    transition-all duration-200
    hover:border-[var(--sh-exam-card-hover-border)]
    hover:shadow-[var(--sh-exam-card-hover-shadow)]
    hover:-translate-y-0.5
    no-underline text-inherit
    block
  "
>
  <!-- Top-right arrow (matches ExamPaper.svelte) -->
  <span
    class="
      absolute top-3 right-3 z-20
      flex h-7 w-7 items-center justify-center rounded-full
      bg-[var(--sh-exam-card-arrow-bg)]
      text-[var(--sh-exam-card-arrow-color)]
      transition-colors duration-150
      group-hover:bg-[var(--sh-exam-card-arrow-hover-bg)]
      pointer-events-none
    "
    aria-hidden="true"
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 17L17 7M17 7H7M17 7v10"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </span>

  <!-- Diagonal ribbon: top-left (top-right arrow stays clear) -->
  <div
    class="pointer-events-none absolute left-0 top-0 z-10 h-[4.25rem] w-[4.25rem] overflow-hidden"
    aria-hidden="true"
  >
    <span
      class="student-batch-card__ribbon-text absolute right-[-20%] top-[1.05rem] z-[1] block w-[140%] origin-center -rotate-45 py-[3px] text-center leading-none shadow-sm"
      data-status={statusKey}
    >
      {batch.status}
    </span>
  </div>

  <div class="flex items-start gap-2.5 pl-11 pr-10 pt-0.5">
    <div
      class="
        flex-shrink-0 h-9 w-9 rounded-full overflow-hidden
        bg-[var(--sh-exam-card-arrow-bg)]
        ring-1 ring-[var(--sh-exam-card-border)]
        flex items-center justify-center
        text-[10px] font-bold text-[var(--sh-exam-card-arrow-color)]
      "
      aria-hidden="true"
    >
      {initials(batch.name)}
    </div>
    <div class="min-w-0 flex-1">
      <h3
        class="text-sm font-semibold text-[var(--sh-exam-card-title)] leading-snug line-clamp-2"
      >
        {batch.name}
      </h3>
    </div>
  </div>

  <dl class="mt-3 space-y-1.5 text-xs">
    <div class="flex justify-between gap-2">
      <dt class="text-[var(--sh-ai-sub)] shrink-0">Tests</dt>
      <dd class="text-[var(--sh-exam-card-title)] font-medium tabular-nums text-right">
        {batch.numberOfTests}
      </dd>
    </div>
    <div class="flex justify-between gap-2">
      <dt class="text-[var(--sh-ai-sub)] shrink-0">Starts</dt>
      <dd class="text-[var(--sh-exam-card-title)] text-right">
        {batch.startDate}
        <span class="text-[var(--sh-ai-sub)]">·</span>
        {batch.startTime}
      </dd>
    </div>
    <div class="flex justify-between gap-2 pt-0.5 border-t border-[var(--sh-exam-card-border)]">
      <dt class="text-[var(--sh-ai-sub)] shrink-0">Created by</dt>
      <dd class="text-[var(--sh-exam-card-title)] text-right line-clamp-1 min-w-0">
        {creatorName}
      </dd>
    </div>
  </dl>
</a>
