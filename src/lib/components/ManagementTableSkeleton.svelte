<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	/** Matches `perf-table` management UIs: checkbox + name | contact | optional status | action */
	let {
		firstColumnLabel = 'STUDENT',
		thirdColumnLabel = 'Status',
		rowCount = 8,
		showStatusColumn = true
	}: {
		firstColumnLabel?: string;
		thirdColumnLabel?: string;
		rowCount?: number;
		showStatusColumn?: boolean;
	} = $props();

	const rows = $derived(Math.min(Math.max(rowCount, 1), 24));
</script>

<!--
  Skeleton layout aligned with ManagementTable pattern:
  - Column 1: checkbox + primary name line
  - Column 2: email + phone lines
  - Column 3 (optional): status pill when showStatusColumn
  - Column 4 / 3: action button
-->
<div class="table-wrap skel-card bg-[var(--skel-surface)]" aria-busy="true" aria-label="Loading table">
	<table class="perf-table">
		<thead>
			<tr>
				<th>
					<div class="flex items-center gap-2">
						<Skeleton width="w-4" height="h-4" rounded="rounded" className="shrink-0" />
						<span
							class="text-[0.78rem] font-semibold uppercase tracking-[0.04em] text-[var(--page-text-muted)]"
							>{firstColumnLabel}</span
						>
					</div>
				</th>
				<th>Contact</th>
				{#if showStatusColumn}
					<th>{thirdColumnLabel}</th>
				{/if}
				<th>Action</th>
			</tr>
		</thead>
		<tbody>
			{#each Array(rows) as _, i (i)}
				<tr>
					<td>
						<div class="flex items-center gap-3">
							<Skeleton width="w-4" height="h-4" rounded="rounded" className="shrink-0" />
							<div class="min-w-0 flex-1 space-y-2">
								<Skeleton width="w-36" height="h-4" className="max-w-full" />
							</div>
						</div>
					</td>
					<td>
						<div class="space-y-2">
							<Skeleton width="w-44" height="h-3" className="max-w-full" />
							<Skeleton width="w-28" height="h-3" className="max-w-full" />
						</div>
					</td>
					{#if showStatusColumn}
						<td>
							<Skeleton width="w-[5.5rem]" height="h-6" rounded="rounded-full" />
						</td>
					{/if}
					<td>
						<Skeleton width="w-24" height="h-8" rounded="rounded-xl" />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
