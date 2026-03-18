<!-- <script lang="ts">
	import { onMount, tick } from 'svelte';

	type MathJaxWindow = Window &
		typeof globalThis & {
			MathJax?: {
				typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
				startup?: {
					promise?: Promise<void>;
					typeset?: boolean;
				};
				tex?: {
					inlineMath?: string[][];
					displayMath?: string[][];
				};
				svg?: {
					fontCache?: string;
				};
			};
		};

	let { content } = $props<{
		content: string;
	}>();

	let container: HTMLDivElement;
	let loaded = false;
	let lastRendered = '';

	async function loadMathJax() {
		if (typeof window === 'undefined') return;

		const mathWindow = window as MathJaxWindow;

		if (mathWindow.MathJax?.typesetPromise) {
			loaded = true;
			return;
		}

		mathWindow.MathJax = {
			tex: {
				inlineMath: [
					['\\(', '\\)'],
					['$', '$']
				],
				displayMath: [
					['\\[', '\\]'],
					['$$', '$$']
				]
			},
			svg: {
				fontCache: 'global'
			},
			startup: {
				typeset: false
			}
		};

		await new Promise<void>((resolve, reject) => {
			const existing = document.querySelector(
				'script[data-mathjax="true"]'
			) as HTMLScriptElement | null;

			if (existing) {
				if (existing.dataset.loaded === 'true') {
					resolve();
					return;
				}

				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener(
					'error',
					() => reject(new Error('Failed to load MathJax')),
					{ once: true }
				);
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js';
			script.async = true;
			script.setAttribute('data-mathjax', 'true');
			script.onload = () => {
				script.dataset.loaded = 'true';
				resolve();
			};
			script.onerror = () => reject(new Error('Failed to load MathJax'));
			document.head.appendChild(script);
		});

		if (mathWindow.MathJax?.startup?.promise) {
			await mathWindow.MathJax.startup.promise;
		}

		loaded = true;
	}

	async function renderMath() {
		if (!container || typeof window === 'undefined') return;
		if (!loaded) return;
		if (lastRendered === content) return;

		const mathWindow = window as MathJaxWindow;

		if (!mathWindow.MathJax?.typesetPromise) return;

		await tick();

		container.innerHTML = content;
		await mathWindow.MathJax.typesetPromise([container]);
		lastRendered = content;
	}

	onMount(async () => {
		await loadMathJax();
		await renderMath();
	});

	$effect(() => {
		content;
		if (loaded) {
			renderMath();
		}
	});
</script>

<div bind:this={container}></div> -->

<script lang="ts">
	import { onMount, tick } from 'svelte';

	type MathJaxWindow = Window &
		typeof globalThis & {
			MathJax?: {
				typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
				startup?: {
					promise?: Promise<void>;
					typeset?: boolean;
				};
				tex?: {
					inlineMath?: string[][];
					displayMath?: string[][];
				};
				svg?: {
					fontCache?: string;
				};
			};
		};

	let { content } = $props<{
		content: string;
	}>();

	let container: HTMLSpanElement;
	let loaded = false;
	let lastRendered = '';

	async function loadMathJax() {
		if (typeof window === 'undefined') return;

		const mathWindow = window as MathJaxWindow;

		if (mathWindow.MathJax?.typesetPromise) {
			loaded = true;
			return;
		}

		mathWindow.MathJax = {
			tex: {
				inlineMath: [
					['\\(', '\\)'],
					['$', '$']
				],
				displayMath: [
					['\\[', '\\]'],
					['$$', '$$']
				]
			},
			svg: {
				fontCache: 'global'
			},
			startup: {
				typeset: false
			}
		};

		await new Promise<void>((resolve, reject) => {
			const existing = document.querySelector(
				'script[data-mathjax="true"]'
			) as HTMLScriptElement | null;

			if (existing) {
				if (existing.dataset.loaded === 'true') {
					resolve();
					return;
				}
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener(
					'error',
					() => reject(new Error('Failed to load MathJax')),
					{ once: true }
				);
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-svg.js';
			script.async = true;
			script.setAttribute('data-mathjax', 'true');
			script.onload = () => {
				script.dataset.loaded = 'true';
				resolve();
			};
			script.onerror = () => reject(new Error('Failed to load MathJax'));
			document.head.appendChild(script);
		});

		if (mathWindow.MathJax?.startup?.promise) {
			await mathWindow.MathJax.startup.promise;
		}

		loaded = true;
	}

	async function renderMath() {
		if (!container || typeof window === 'undefined') return;
		if (!loaded) return;
		if (lastRendered === content) return;

		const mathWindow = window as MathJaxWindow;
		if (!mathWindow.MathJax?.typesetPromise) return;

		await tick();
		container.innerHTML = content;
		await mathWindow.MathJax.typesetPromise([container]);

		// After MathJax renders, force all SVG math elements to be inline
		container.querySelectorAll('mjx-container').forEach((el) => {
			(el as HTMLElement).style.display = 'inline';
			(el as HTMLElement).style.margin = '0 0.15em';
		});
		container.querySelectorAll('mjx-container > svg').forEach((el) => {
			(el as SVGElement).style.display = 'inline';
			(el as SVGElement).style.verticalAlign = 'middle';
		});

		lastRendered = content;
	}

	onMount(async () => {
		await loadMathJax();
		await renderMath();
	});

	$effect(() => {
		content;
		if (loaded) {
			renderMath();
		}
	});
</script>

<!--
  KEY FIX: <span> instead of <div>.
  display:inline-block on the span preserves inline flow while
  still allowing the MathJax SVGs inside to size correctly.
-->
<span bind:this={container} class="math-text"></span>

<style>
	.math-text {
		display: inline;
	}

	/* MathJax SVG output — keep everything inline */
	.math-text :global(mjx-container) {
		display: inline !important;
		margin: 0 0.15em;
	}

	.math-text :global(mjx-container[display='true']) {
		display: block !important;
		margin: 0.75em 0;
		text-align: center;
	}

	.math-text :global(mjx-container > svg) {
		display: inline !important;
		vertical-align: middle;
	}

	/* Keep any <p> tags that come from the content from breaking flow */
	.math-text :global(p) {
		display: inline;
		margin: 0;
	}
</style>