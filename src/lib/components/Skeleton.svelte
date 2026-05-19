<script lang="ts">
	let {
		width = 'w-full',
		height = 'h-4',
		rounded = 'rounded',
		className = '',
		strong = false
	}: {
		width?: string;
		height?: string;
		rounded?: string;
		className?: string;
		/** Slightly higher contrast bar (headings, icons). */
		strong?: boolean;
	} = $props();
</script>

<div
	class="skel-bar {strong ? 'skel-bar--strong' : ''} {width} {height} {rounded} {className}"
	aria-hidden="true"
></div>
