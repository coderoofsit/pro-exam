<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import SubscriptionProfileSkeleton from '$lib/components/skeletons/SubscriptionProfileSkeleton.svelte';
	import SubscriptionLiveSkeleton from '$lib/components/skeletons/SubscriptionLiveSkeleton.svelte';
	import SubscriptionPlansSkeleton from '$lib/components/skeletons/SubscriptionPlansSkeleton.svelte';
	import SubscriptionPaymentHistorySkeleton from '$lib/components/skeletons/SubscriptionPaymentHistorySkeleton.svelte';
</script>

<!-- Full-page fallback — matches subscription/+page.svelte section order -->
<div
	class="subscription-page mx-auto max-w-5xl px-4 pt-2 md:pb-12 sm:px-5"
	aria-hidden="true"
	aria-busy="true"
>
	<header class="mb-10 text-center sm:mb-14">
		<Skeleton
			width="w-44 sm:w-52"
			height="h-7"
			rounded="rounded-full"
			className="mx-auto mb-3"
		/>
		<Skeleton width="w-full max-w-xl" height="h-9 sm:h-10" className="mx-auto" strong />
		<Skeleton width="w-full max-w-2xl" height="h-5" className="mx-auto mt-4" />
	</header>

	<SubscriptionProfileSkeleton />

	<section
		class="mb-8 rounded-2xl border border-[color-mix(in_srgb,var(--page-link)_28%,var(--sh-exam-card-border))] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)] sm:p-6"
	>
		<div class="flex flex-wrap items-start justify-between gap-3">
			<Skeleton width="w-32" height="h-3" />
			<Skeleton width="w-14" height="h-3" />
		</div>
		<SubscriptionLiveSkeleton />
	</section>

	<section
		class="mb-10 rounded-2xl border border-[color-mix(in_srgb,var(--page-link)_26%,var(--sh-exam-card-border))] bg-[var(--sh-exam-card-bg)] p-5 sm:p-6"
	>
		<Skeleton width="w-28" height="h-3" />
		<Skeleton width="w-full max-w-xs" height="h-3" className="mt-3" />
		<SubscriptionPlansSkeleton />
	</section>

	<section class="mb-10 overflow-hidden rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)]">
		<div class="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-[1.125rem]">
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton width="w-32" height="h-3" />
				<Skeleton width="w-48" height="h-3" />
			</div>
			<Skeleton width="w-9" height="h-9" rounded="rounded-xl" className="shrink-0" />
		</div>
		<div class="border-t border-[var(--sh-exam-card-border)] px-5 pb-5 pt-4 sm:px-6">
			<SubscriptionPaymentHistorySkeleton />
		</div>
	</section>

	<div class="mb-10 grid gap-4 sm:grid-cols-3">
		{#each Array(3) as _, i (i)}
			<div
				class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-[var(--sh-exam-card-hover-shadow)]"
			>
				<Skeleton width="w-10" height="h-10" rounded="rounded-xl" className="mb-3" />
				<Skeleton width="w-32" height="h-5" strong />
				<Skeleton width="w-full" height="h-3" className="mt-2" />
				<Skeleton width="w-11/12" height="h-3" className="mt-1.5" />
			</div>
		{/each}
	</div>

	<section
		class="rounded-2xl border border-[var(--sh-exam-card-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_55%,transparent)_0%,var(--sh-exam-card-bg)_100%)] p-6 sm:p-8"
	>
		<Skeleton width="w-40" height="h-6" strong />
		<div class="mt-4 space-y-3">
			{#each Array(3) as _, i (i)}
				<div class="flex gap-3">
					<Skeleton width="w-4" height="h-4" rounded="rounded" className="shrink-0" />
					<Skeleton width="w-full" height="h-4" />
				</div>
			{/each}
		</div>
	</section>
</div>
