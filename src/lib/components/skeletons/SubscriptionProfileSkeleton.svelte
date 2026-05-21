<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
</script>

<!-- Mirrors “Your profile” card on subscription/+page.svelte -->
<section
	class="mb-8 rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 sm:p-6"
	aria-hidden="true"
	aria-busy="true"
	aria-label="Loading profile"
>
	<Skeleton width="w-24" height="h-3" />
	<Skeleton width="w-36 sm:w-44" height="h-5" className="mt-2" strong />
	<Skeleton width="w-full max-w-md" height="h-4" className="mt-2" />
</section>
