<script lang="ts">
	type Props = {
		type?: 'button' | 'submit' | 'reset';
		className?: string;
		tone?: 'default' | 'pyq';
		variant?: 'base' | 'ta-nav' | 'ta-mark' | 'ta-primary' | 'ta-submit';
		disabled?: boolean;
		onClick?: (e: MouseEvent) => void;
		ariaLabel?: string;
	};

	let {
		type = 'button',
		className = '',
		tone = 'default',
		variant = 'base',
		disabled = false,
		onClick,
		ariaLabel
	}: Props = $props();

	const toneClass = $derived(tone === 'pyq' ? 'exam-route-back-btn--pyq' : '');
	const variantClass = $derived(
		variant === 'ta-nav'
			? 'exam-btn--ta-nav'
			: variant === 'ta-mark'
				? 'exam-btn--ta-mark'
				: variant === 'ta-primary'
					? 'exam-btn--ta-primary'
					: variant === 'ta-submit'
						? 'exam-btn--ta-submit'
						: ''
	);

	function handleClick(e: MouseEvent) {
		onClick?.(e);
	}
</script>

<button
	type={type}
	onclick={handleClick}
	disabled={disabled}
	class={`exam-route-back-btn ${toneClass} ${variantClass} ${className}`.trim()}
	aria-label={ariaLabel}
>
	<slot />
</button>
