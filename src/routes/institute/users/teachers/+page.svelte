<script lang="ts">
	import { browser } from '$app/environment';
</script>

<svelte:head>
	<title>Teachers Management | Institute</title>
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
	<div class="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--page-text)] sm:text-3xl">Teachers Management</h1>
			<p class="mt-1 text-sm text-[var(--page-text-muted)]">Manage teaching staff and assign roles within your institute.</p>
		</div>
		<button class="inline-flex items-center justify-center rounded-xl bg-[var(--accent-cta-cyan)] px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95">
			Add New Teacher
		</button>
	</div>

	<div class="rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-8 text-center shadow-sm">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent-cta-cyan)_10%,transparent)] text-[var(--accent-cta-cyan)]">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
				<circle cx="8.5" cy="7" r="4"></circle>
				<polyline points="17 11 19 13 23 9"></polyline>
			</svg>
		</div>
		<h2 class="text-lg font-semibold text-[var(--page-text)]">No teachers found</h2>
		<p class="mt-2 text-[var(--page-text-muted)]">Invite teachers to join your institute and start managing their classes.</p>
	</div>
</div>
