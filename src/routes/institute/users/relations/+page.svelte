<script lang="ts">
	import { browser } from '$app/environment';
</script>

<svelte:head>
	<title>Teacher & Student Relations | Institute</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
	<div class="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--page-text)] sm:text-3xl">Teacher & Student Relations</h1>
			<p class="mt-1 text-sm text-[var(--page-text-muted)]">Map teachers to students and manage batch assignments.</p>
		</div>
		<button
			type="button"
			class="inline-flex items-center justify-center rounded-xl bg-[var(--page-link)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_22px_-6px_color-mix(in_srgb,var(--page-link)_35%,transparent)] transition hover:opacity-90 active:scale-95"
		>
			Create New Mapping
		</button>
	</div>

	<div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-8 text-center shadow-sm">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--page-link)_12%,transparent)] text-[var(--page-link)]">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101"></path>
				<path d="M10.172 13.828a4 4 0 0 0 5.656 0l4-4a4 4 0 1 0-5.656-5.656l-1.102 1.101"></path>
			</svg>
		</div>
		<h2 class="text-lg font-semibold text-[var(--page-text)]">No relations established</h2>
		<p class="mt-2 text-[var(--page-text-muted)]">Connect teachers with their students to enable monitoring and performance tracking.</p>
	</div>
</div>
