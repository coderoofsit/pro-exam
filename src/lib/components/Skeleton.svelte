<script lang="ts" module>
	/** Default exam card placeholders shown while exam grids load. */
	export const EXAM_CARD_SKELETON_COUNT = 3;
</script>

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
