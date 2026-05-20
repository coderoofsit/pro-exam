<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';

	let { narrow = false }: { narrow?: boolean } = $props();
</script>

<div
	class="mx-auto space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-6 {narrow ? 'max-w-lg' : 'max-w-3xl'}"
	aria-busy="true"
	aria-label="Loading page"
>
	<Skeleton width="w-32 sm:w-40" height="h-7 sm:h-8" strong rounded="rounded-lg" />
	<Skeleton width="w-full" height="h-3.5 sm:h-4" />
	<Skeleton width="w-[94%]" height="h-3.5 sm:h-4" />
	<Skeleton width="w-[88%]" height="h-3.5 sm:h-4" />
	<div class="skel-card space-y-2 rounded-xl p-4 sm:space-y-3 sm:rounded-2xl sm:p-5">
		<Skeleton width="w-1/3" height="h-4 sm:h-5" strong />
		<Skeleton width="w-full" height="h-3.5 sm:h-4" />
		<Skeleton width="w-5/6" height="h-3.5 sm:h-4" />
		<Skeleton width="w-2/3" height="h-3.5 sm:h-4" />
	</div>
</div>
