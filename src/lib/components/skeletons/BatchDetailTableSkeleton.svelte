<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { rowCount = 8 }: { rowCount?: number } = $props();
</script>

<div class="table-wrap bg-[var(--sh-exam-card-bg)]" aria-hidden="true">
	<table class="perf-table">
		<thead>
			<tr>
				<th>
					<div class="flex items-center gap-2">
						<Skeleton width="w-4" height="h-4" rounded="rounded-sm" />
						<Skeleton width="w-16" height="h-3" />
					</div>
				</th>
				<th><Skeleton width="w-14" height="h-3" /></th>
				<th><Skeleton width="w-12" height="h-3" /></th>
			</tr>
		</thead>
		<tbody>
			{#each Array(rowCount) as _, i (i)}
				<tr>
					<td>
						<div class="flex items-center gap-3">
							<Skeleton width="w-4" height="h-4" rounded="rounded-sm" />
							<div class="min-w-0 flex-1 space-y-2">
								<Skeleton width="w-36" height="h-4" strong />
								<Skeleton width="w-24" height="h-3" />
							</div>
						</div>
					</td>
					<td>
						<div class="space-y-2">
							<Skeleton width="w-40" height="h-4" />
							<Skeleton width="w-28" height="h-3" />
						</div>
					</td>
					<td>
						<Skeleton width="w-16" height="h-6" rounded="rounded-full" />
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
