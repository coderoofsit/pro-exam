<script lang="ts">
	let {
		open = false,
		title = 'Remove permanently?',
		entitySingular = 'user',
		entityPlural = 'users',
		count = 0,
		submitting = false,
		errorMessage = '',
		onCancel,
		onConfirm
	}: {
		open: boolean;
		title?: string;
		entitySingular?: string;
		entityPlural?: string;
		count?: number;
		submitting?: boolean;
		errorMessage?: string;
		onCancel: () => void;
		onConfirm: () => void;
	} = $props();

	const noun = $derived(count === 1 ? entitySingular : entityPlural);
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-permanent-remove-title"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && !submitting && onCancel()}
		onkeydown={(e) => e.key === 'Escape' && !submitting && onCancel()}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-6 shadow-xl"
			role="document"
			onclick={(e) => e.stopPropagation()}
		>
			<h2
				id="confirm-permanent-remove-title"
				class="text-lg font-bold text-[var(--sh-section-title)]"
			>
				{title}
			</h2>

			<p class="mt-2 text-sm leading-relaxed text-[var(--sh-ai-sub)]">
				You are about to permanently remove
				<span class="font-semibold text-[var(--sh-section-title)]">
					{count}
					{noun}
				</span>
				from your institute. This action cannot be undone.
			</p>

			{#if errorMessage}
				<p
					class="mt-4 rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-sm text-[var(--pc-error-text)]"
					role="alert"
				>
					{errorMessage}
				</p>
			{/if}

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class="rounded-xl border border-[var(--sh-exam-card-border)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--sh-section-title)] transition hover:bg-[color-mix(in_srgb,var(--sh-exam-card-arrow-bg)_40%,transparent)] disabled:opacity-50"
					disabled={submitting}
					onclick={onCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl border border-[color-mix(in_srgb,var(--semantic-error)_35%,var(--sh-exam-card-border))] bg-[color-mix(in_srgb,var(--semantic-error)_92%,#fff_8%)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 dark:bg-[color-mix(in_srgb,var(--semantic-error)_88%,#000_12%)]"
					disabled={submitting}
					onclick={onConfirm}
				>
					{submitting ? 'Removing…' : 'Remove permanently'}
				</button>
			</div>
		</div>
	</div>
{/if}
