<script lang="ts">
  import type { GetTestUserFilterOptions } from "$lib/api/tests";

  let {
    filterOptions,
    creatorUserId = "",
    examId = "",
    kind = "",
    status = "",
    onFilterSelect,
  }: {
    filterOptions: GetTestUserFilterOptions;
    creatorUserId?: string;
    examId?: string;
    kind?: string;
    status?: string;
    onFilterSelect: (
      key: "creatorUserId" | "examId" | "kind" | "status",
      value: string,
    ) => void;
  } = $props();
</script>

<div
  class="mt-2 grid gap-3 rounded-xl border border-[var(--sh-exam-card-border)] bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_35%,var(--sh-exam-card-bg))] p-4 sm:grid-cols-2 lg:grid-cols-4"
>
  <label class="min-w-0 sm:col-span-2 lg:col-span-1">
    <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]"
      >Creator</span
    >
    <select
      value={creatorUserId}
      class="tests-filter-select w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm"
      onchange={(e) => onFilterSelect("creatorUserId", e.currentTarget.value)}
    >
      <option value="">All creators</option>
      {#each filterOptions.creators ?? [] as c (c.userId)}
        <option value={c.userId}>{c.firstName} {c.lastName} ({c.testsCount})</option>
      {/each}
    </select>
  </label>

  <label class="min-w-0 sm:col-span-2 lg:col-span-1">
    <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]"
      >Exam</span
    >
    <select
      value={examId}
      class="tests-filter-select w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm"
      onchange={(e) => onFilterSelect("examId", e.currentTarget.value)}
    >
      <option value="">All exams</option>
      {#each filterOptions.exams ?? [] as ex (ex.examId)}
        <option value={ex.examId}>{ex.name?.en ?? ex.slug} ({ex.count})</option>
      {/each}
    </select>
  </label>

  <label class="min-w-0">
    <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]"
      >Kind</span
    >
    <select
      value={kind}
      class="tests-filter-select w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm"
      onchange={(e) => onFilterSelect("kind", e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each filterOptions.kinds ?? [] as k (k.value)}
        <option value={k.value}>{k.value} ({k.count})</option>
      {/each}
    </select>
  </label>

  <label class="min-w-0">
    <span class="mb-1 block text-xs font-medium text-[var(--sh-ai-sub)]"
      >Status</span
    >
    <select
      value={status}
      class="tests-filter-select w-full rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] px-3 py-2.5 text-sm"
      onchange={(e) => onFilterSelect("status", e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each filterOptions.statuses ?? [] as s (s.value)}
        <option value={s.value}>{s.value} ({s.count})</option>
      {/each}
    </select>
  </label>
</div>
