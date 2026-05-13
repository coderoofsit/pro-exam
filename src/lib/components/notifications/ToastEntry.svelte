<script lang="ts">
	import { onMount } from 'svelte';
	import { dismissToast, type ToastItem } from '$lib/notifications';

	let { toast }: { toast: ToastItem } = $props();

	onMount(() => {
		const ms = toast.durationMs;
		if (ms <= 0) return;
		const t = window.setTimeout(() => dismissToast(toast.id), ms);
		return () => window.clearTimeout(t);
	});

	const variantClass: Record<ToastItem['variant'], string> = {
		success: 'toast-variant-success',
		danger: 'toast-variant-danger',
		warning: 'toast-variant-warning',
		info: 'toast-variant-info',
		alert: 'toast-variant-alert'
	};
</script>

<div
	class="toast-entry new-message-box {variantClass[toast.variant]}"
	role="status"
	aria-live="polite"
>
	<div class="toast-inner">
		<div class="toast-icon-wrap" aria-hidden="true">
			{#if toast.variant === 'success'}
				<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M20 6L9 17l-5-5" />
				</svg>
			{:else if toast.variant === 'danger'}
				<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			{:else if toast.variant === 'warning'}
				<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
					<path d="M12 2 2 22h20L12 2z" />
					<path d="M12 9v5M12 17h.01" stroke-linecap="round" />
				</svg>
			{:else if toast.variant === 'info'}
				<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 16v-4M12 8h.01" />
				</svg>
			{:else}
				<svg class="toast-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 8v4M12 16h.01" />
				</svg>
			{/if}
		</div>
		<div class="toast-body tip-box">
			<p class="toast-message">{toast.message}</p>
			{#if toast.action}
				<a class="toast-action" href={toast.action.href}>{toast.action.label}</a>
			{/if}
		</div>
		<button
			type="button"
			class="toast-close"
			aria-label="Cerrar notificación"
			onclick={() => dismissToast(toast.id)}
		>
			<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.4">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>
</div>

<style>
	.toast-entry {
		margin: 0;
		padding: 1.5px;
		border-radius: 2px;
		box-shadow: 0 2px 9px rgba(0, 0, 0, 0.12);
		max-width: 100%;
	}

	.toast-inner {
		display: flex;
		align-items: flex-start;
		gap: 5px;
		padding: 5px 4px 5px 5px;
		min-height: 22px;
	}

	.toast-icon-wrap {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 1px;
	}

	.toast-svg {
		width: 11px;
		height: 11px;
	}

	.tip-box {
		flex: 1;
		min-width: 0;
		padding: 2px 2px 1px 0;
	}

	.toast-message {
		margin: 0;
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.toast-action {
		display: inline-block;
		margin-top: 3px;
		font-size: 0.5rem;
		font-weight: 600;
		text-decoration: underline;
	}

	.toast-close {
		flex-shrink: 0;
		margin: 0;
		padding: 3px;
		min-width: 22px;
		min-height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 3px;
		line-height: 0;
		opacity: 0.75;
		transition: opacity 0.15s, background 0.15s;
	}

	.toast-close:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.06);
	}

	/* Variant skins (aligned with your palette) */
	.toast-variant-success .toast-inner {
		background: #dcedc8;
		color: #33691e;
	}
	.toast-variant-success .toast-icon-wrap {
		background: #8bc34a;
		color: #fff;
	}
	.toast-variant-success .toast-action {
		color: #33691e;
	}

	.toast-variant-danger .toast-inner {
		background: #ffccbc;
		color: #b71c1c;
	}
	.toast-variant-danger .toast-icon-wrap {
		background: #f44336;
		color: #fff;
	}
	.toast-variant-danger .toast-action {
		color: #b71c1c;
	}

	.toast-variant-warning .toast-inner {
		background: #fff9c4;
		color: #212121;
	}
	.toast-variant-warning .toast-icon-wrap {
		background: #ffeb3b;
		color: #212121;
	}
	.toast-variant-warning .toast-action {
		color: #212121;
	}

	.toast-variant-info .toast-inner {
		background: #b3e5fc;
		color: #01579b;
	}
	.toast-variant-info .toast-icon-wrap {
		background: #03a9f4;
		color: #fff;
	}
	.toast-variant-info .toast-action {
		color: #01579b;
	}

	.toast-variant-alert {
		background: #ff6f00;
	}
	.toast-variant-alert .toast-inner {
		background: #fff8e1;
		color: #212121;
	}
	.toast-variant-alert .toast-icon-wrap {
		background: #ff6f00;
		color: #fff;
	}
	.toast-variant-alert .toast-action {
		color: #212121;
	}
</style>
