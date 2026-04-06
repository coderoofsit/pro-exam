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

	function normalizeMfenced(root: HTMLElement) {
		const mfencedNodes = Array.from(root.querySelectorAll('mfenced'));
		for (const mfenced of mfencedNodes) {
			const ns = mfenced.namespaceURI || 'http://www.w3.org/1998/Math/MathML';
			const mrow = document.createElementNS(ns, 'mrow');
			const openMo = document.createElementNS(ns, 'mo');
			openMo.textContent = mfenced.getAttribute('open') || '(';
			openMo.setAttribute('fence', 'true');
			openMo.setAttribute('stretchy', 'true');
			openMo.setAttribute('symmetric', 'true');
			mrow.appendChild(openMo);

			const separatorsRaw = mfenced.getAttribute('separators') || ',';
			const separators = separatorsRaw.split('').filter(Boolean);
			const children = Array.from(mfenced.childNodes);
			children.forEach((child, index) => {
				mrow.appendChild(child);
				if (index < children.length - 1) {
					const separatorMo = document.createElementNS(ns, 'mo');
					separatorMo.textContent = separators[index] ?? separators[separators.length - 1] ?? ',';
					mrow.appendChild(separatorMo);
				}
			});

			const closeMo = document.createElementNS(ns, 'mo');
			closeMo.textContent = mfenced.getAttribute('close') || ')';
			closeMo.setAttribute('fence', 'true');
			closeMo.setAttribute('stretchy', 'true');
			closeMo.setAttribute('symmetric', 'true');
			mrow.appendChild(closeMo);
			mfenced.replaceWith(mrow);
		}
	}

	function normalizeMathDisplay(root: HTMLElement) {
		const mathNodes = Array.from(root.querySelectorAll('math'));
		for (const mathEl of mathNodes) {
			const hasTable = Boolean(mathEl.querySelector('mtable'));
			const rowCount = mathEl.querySelectorAll('mtr').length;
			const explicitDisplay = mathEl.getAttribute('display');
			const explicitMode = mathEl.getAttribute('mode');
			const isAlreadyDisplay = explicitDisplay === 'block' || explicitMode === 'display';
			if (!isAlreadyDisplay && (hasTable || rowCount > 1)) {
				// Keep multiline math in inline flow to avoid forcing following text to next line.
				// Use displaystyle + class for larger, readable operators and delimiters.
				mathEl.setAttribute('display', 'inline');
				mathEl.setAttribute('displaystyle', 'true');
				mathEl.classList.add('math-multiline-inline');
			}
		}
	}

	async function loadMathJax() {
		if (typeof window === 'undefined') return;

		const mathWindow = window as MathJaxWindow;
		const desiredScript = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-svg.js';
		const existingScript = document.querySelector(
			'script[data-mathjax="true"]'
		) as HTMLScriptElement | null;
		const existingScriptIsDesired = Boolean(existingScript?.src?.includes('tex-mml-svg.js'));
		if (existingScript && !existingScriptIsDesired) {
			existingScript.remove();
			delete mathWindow.MathJax;
		}

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
			script.src = desiredScript;
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
		normalizeMfenced(container);
		normalizeMathDisplay(container);
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

	.math-text :global(math.math-multiline-inline) {
		display: inline-block;
		vertical-align: middle;
		margin: 0 0.2em;
	}
</style>