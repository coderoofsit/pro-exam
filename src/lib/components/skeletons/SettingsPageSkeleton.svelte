<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<div class="mx-auto w-full max-w-2xl space-y-6 px-4 py-6" aria-hidden="true">
	<Skeleton width="w-32" height="h-8" />
	<div class="space-y-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6">
		<Skeleton width="w-40" height="h-5" />
		<Skeleton width="w-full" height="h-10" rounded="rounded-xl" />
		<Skeleton width="w-full" height="h-10" rounded="rounded-xl" />
		<Skeleton width="w-28" height="h-9" rounded="rounded-xl" />
	</div>
	<div class="space-y-4 rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-6">
		<Skeleton width="w-36" height="h-5" />
		<Skeleton width="w-full" height="h-24" rounded="rounded-xl" />
	</div>
</div>
