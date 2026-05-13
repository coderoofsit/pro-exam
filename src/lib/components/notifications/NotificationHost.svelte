<script lang="ts">
	import { toasts } from '$lib/notifications';
	import ToastEntry from './ToastEntry.svelte';
</script>

<div class="notification-host" aria-live="polite" aria-relevant="additions removals">
	{#each $toasts as toast (toast.id)}
		<ToastEntry {toast} />
	{/each}
</div>

<style>
	.notification-host {
		position: fixed;
		/* Below fixed app header (h-[72px] in Sidebar) + small gap */
		top: calc(72px + 0.5rem);
		right: 1rem;
		z-index: 10050;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.375rem;
		max-width: min(210px, calc(100vw - 2rem));
		pointer-events: none;
	}

	.notification-host :global(.toast-entry) {
		pointer-events: auto;
		width: 100%;
	}
</style>
