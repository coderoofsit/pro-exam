<script context="module" lang="ts">
	let mathJaxLoadPromise: Promise<void> | null = null;
</script>

<script lang="ts">
	import { onMount, tick } from 'svelte';

	type MathJaxWindow = Window &
		typeof globalThis & {
			MathJax?: {
				typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
				typesetClear?: (elements?: HTMLElement[]) => void;
				startup?: {
					promise?: Promise<void>;
					typeset?: boolean;
				};
				loader?: {
					load?: string[];
				};
				tex?: {
					inlineMath?: string[][];
					displayMath?: string[][];
					processEscapes?: boolean;
					packages?: {
						'[+]'?: string[];
					};
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
	let renderToken = 0;

	function normalizeLatexContent(value: string) {
		return String(value ?? '')
			.replace(/\\text\s+\{/g, '\\text{')
			.replace(/\\mathrm\s+\{/g, '\\mathrm{')
			.replace(/\\mathbf\s+\{/g, '\\mathbf{')
			.replace(/\\boldsymbol\s+\{/g, '\\boldsymbol{')
			.replace(/\\mathit\s+\{/g, '\\mathit{')
			.replace(/\\mathsf\s+\{/g, '\\mathsf{')
			.replace(/\\frac\s+\{/g, '\\frac{')
			.replace(/\\sqrt\s+\{/g, '\\sqrt{');
	}

	async function loadMathJax() {
		if (typeof window === 'undefined') return;

		const mathWindow = window as MathJaxWindow;

		if (mathWindow.MathJax?.typesetPromise) {
			loaded = true;
			return;
		}

		if (mathJaxLoadPromise) {
			await mathJaxLoadPromise;
			loaded = true;
			return;
		}

		mathJaxLoadPromise = new Promise<void>((resolve, reject) => {
			mathWindow.MathJax = {
				loader: {
					load: ['[tex]/boldsymbol', '[tex]/ams', '[tex]/color', '[tex]/cancel', '[tex]/mhchem']
				},
				tex: {
					packages: {
						'[+]': ['boldsymbol', 'ams', 'color', 'cancel', 'mhchem']
					},
					inlineMath: [
						['\\(', '\\)'],
						['$', '$']
					],
					displayMath: [
						['\\[', '\\]'],
						['$$', '$$']
					],
					processEscapes: true
				},
			svg: {
				fontCache: 'global',
				scale: 0.92
			},
				startup: {
					typeset: false
				}
			};

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

			// LaTeX input + SVG output. Best for your current question data.
			script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';

			// Use this only if your backend sends real MathML like <math>...</math>.
			// script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js';

			script.async = true;
			script.setAttribute('data-mathjax', 'true');

			script.onload = async () => {
				script.dataset.loaded = 'true';

				if (mathWindow.MathJax?.startup?.promise) {
					await mathWindow.MathJax.startup.promise;
				}

				resolve();
			};

			script.onerror = () => reject(new Error('Failed to load MathJax'));
			document.head.appendChild(script);
		});

		await mathJaxLoadPromise;
		loaded = true;
	}

	async function renderMath() {
		if (!container || typeof window === 'undefined') return;
		if (!loaded) return;

		const normalizedContent = normalizeLatexContent(content);

		if (lastRendered === normalizedContent) return;

		const currentToken = ++renderToken;
		const mathWindow = window as MathJaxWindow;

		if (!mathWindow.MathJax?.typesetPromise) return;

		await tick();

		if (currentToken !== renderToken) return;

		try {
			mathWindow.MathJax.typesetClear?.([container]);

			container.innerHTML = normalizedContent;

			await mathWindow.MathJax.typesetPromise([container]);

			if (currentToken !== renderToken) return;

			container.querySelectorAll('mjx-container').forEach((el) => {
				const htmlEl = el as HTMLElement;
				htmlEl.style.display = 'inline';
				htmlEl.style.margin = '0 0.15em';
			});

			container.querySelectorAll('mjx-container > svg').forEach((el) => {
				const svgEl = el as SVGElement;
				svgEl.style.display = 'inline';
				svgEl.style.verticalAlign = 'middle';
			});

			lastRendered = normalizedContent;
		} catch (error) {
			console.error('MathJax render failed:', error);
		}
	}

	onMount(async () => {
		await loadMathJax();
		await renderMath();

		return () => {
			renderToken++;

			const mathWindow = window as MathJaxWindow;
			if (container) {
				mathWindow.MathJax?.typesetClear?.([container]);
			}
		};
	});

	$effect(() => {
		const normalizedContent = normalizeLatexContent(content);

		if (loaded && normalizedContent !== lastRendered) {
			renderMath();
		}
	});
</script>

<span bind:this={container} class="math-text"></span>

<style>
	.math-text {
		display: inline;
		white-space: pre-line;
	}

	.math-text :global(mjx-container) {
		display: inline !important;
		margin: 0 0.15em;
		opacity: 1 !important;
		color: inherit;
	}

	.math-text :global(mjx-container[display='true']) {
		display: block !important;
		margin: 0.75em 0;
		text-align: center;
	}

	.math-text :global(mjx-container > svg) {
		display: inline !important;
		vertical-align: middle;
		color: inherit;
		fill: currentColor;
		opacity: 1 !important;
	}

	.math-text :global(p) {
		display: block;
		margin: 0.45em 0;
	}
</style>