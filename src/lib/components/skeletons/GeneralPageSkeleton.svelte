<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { narrow = false }: { narrow?: boolean } = $props();
</script>

<div
	class="mx-auto space-y-5 px-4 py-6 {narrow ? 'max-w-lg' : 'max-w-3xl'}"
	aria-busy="true"
	aria-label="Loading page"
>
	<Skeleton width="w-40" height="h-8" strong rounded="rounded-lg" />
	<Skeleton width="w-full" height="h-4" />
	<Skeleton width="w-[94%]" height="h-4" />
	<Skeleton width="w-[88%]" height="h-4" />
	<div class="skel-card rounded-2xl p-5 space-y-3">
		<Skeleton width="w-1/3" height="h-5" strong />
		<Skeleton width="w-full" height="h-4" />
		<Skeleton width="w-5/6" height="h-4" />
		<Skeleton width="w-2/3" height="h-4" />
	</div>
</div>
