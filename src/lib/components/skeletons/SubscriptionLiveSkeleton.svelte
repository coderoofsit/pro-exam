<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<!-- Mirrors “Your subscription” loaded state in subscription/+page.svelte -->
<div class="mt-6 space-y-6" aria-hidden="true" aria-busy="true">
	<div
		class="rounded-xl border border-[color-mix(in_srgb,var(--page-link)_32%,var(--sh-exam-card-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--page-link)_12%,transparent)_0%,var(--sh-exam-card-bg)_100%)] p-4 sm:p-5"
	>
		<div class="flex flex-wrap items-center gap-2">
			<Skeleton width="w-[5.5rem]" height="h-5" rounded="rounded-full" />
			<Skeleton width="w-14" height="h-5" rounded="rounded-full" />
		</div>
		<Skeleton width="w-40 sm:w-48" height="h-6" className="mt-3" strong />
		<Skeleton width="w-52 sm:w-64" height="h-4" className="mt-2" />
		<dl class="mt-4 grid gap-3 sm:grid-cols-2">
			<div>
				<Skeleton width="w-10" height="h-3" />
				<Skeleton width="w-28" height="h-4" className="mt-1" />
			</div>
			<div>
				<Skeleton width="w-8" height="h-3" />
				<Skeleton width="w-28" height="h-4" className="mt-1" />
			</div>
			<div class="sm:col-span-2">
				<Skeleton width="w-24" height="h-3" />
				<Skeleton width="w-full max-w-sm" height="h-4" className="mt-1" />
			</div>
		</dl>
	</div>

	<div
		class="flex flex-col gap-4 rounded-xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="min-w-0 flex-1 space-y-2">
			<Skeleton width="w-24" height="h-4" strong />
			<Skeleton width="w-full max-w-md" height="h-3" />
		</div>
		<Skeleton width="w-36 sm:w-40" height="h-10" rounded="rounded-xl" className="shrink-0" />
	</div>
</div>
