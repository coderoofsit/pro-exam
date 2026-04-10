<script lang="ts">
  let { 
    width = 'w-full', 
    height = 'h-4', 
    rounded = 'rounded', 
    className = '' 
  } = $props();
</script>

<div 
  class="animate-pulse bg-[var(--page-card-border)] opacity-20 {width} {height} {rounded} {className}"
  aria-hidden="true"
></div>
