<script context="module" lang="ts">
	type MathJaxWindow = Window &
		typeof globalThis & {
			MathJax?: {
				typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
			};
		};

	// Batch MathJax typesetting across many <MathText /> instances.
	// This prevents sequential backlog when users switch sections quickly.
	const TYPESER_DEBOUNCE_MS = 80;
	// Keep each MathJax call small; large explanation blocks can freeze the tab
	// when too many nodes are typeset in one Promise.
	const TYPESET_BATCH_SIZE = 2;
	const MAX_RENDER_CACHE_ENTRIES = 180;
	const pending = new Set<HTMLElement>();
	let flushTimer: number | null = null;
	let flushRunning = false;

	// Simple in-memory cache: latex string -> rendered HTML
	const renderedCache = new Map<string, string>();

	function getCachedHtml(key: string): string | undefined {
		const value = renderedCache.get(key);
		if (value === undefined) return undefined;
		// LRU touch on read
		renderedCache.delete(key);
		renderedCache.set(key, value);
		return value;
	}

	function setCachedHtml(key: string, value: string) {
		if (!key) return;
		if (renderedCache.has(key)) {
			renderedCache.delete(key);
		}
		renderedCache.set(key, value);
		while (renderedCache.size > MAX_RENDER_CACHE_ENTRIES) {
			const oldestKey = renderedCache.keys().next().value as string | undefined;
			if (!oldestKey) break;
			renderedCache.delete(oldestKey);
		}
	}

	function postProcessTypeset(root: HTMLElement) {
		// Keep everything inline for consistent layout with your question cards.
		root.querySelectorAll('mjx-container').forEach((el) => {
			(el as HTMLElement).style.display = 'inline';
			(el as HTMLElement).style.margin = '0 0.15em';
		});
		root.querySelectorAll('mjx-container > svg').forEach((el) => {
			(el as SVGElement).style.display = 'inline';
			(el as SVGElement).style.verticalAlign = 'middle';
		});
		root.setAttribute('data-math-state', 'ready');
	}

	function scheduleFlush() {
		if (flushRunning) return;
		if (flushTimer != null) return;
		if (typeof window === 'undefined') return;

		flushTimer = window.setTimeout(() => {
			flushTimer = null;
			void flush();
		}, TYPESER_DEBOUNCE_MS);
	}

	function requestTypeset(el: HTMLElement) {
		if (!el?.isConnected) return;
		pending.add(el);
		scheduleFlush();
	}

	function cancelTypeset(el: HTMLElement) {
		pending.delete(el);
	}

	async function flush() {
		if (flushRunning) return;
		flushRunning = true;

		const mathWindow = window as MathJaxWindow;
		const elements = Array.from(pending).filter((x) => x.isConnected);
		pending.clear();

		try {
			if (mathWindow.MathJax?.typesetPromise && elements.length) {
				for (let i = 0; i < elements.length; i += TYPESET_BATCH_SIZE) {
					const chunk = elements
						.slice(i, i + TYPESET_BATCH_SIZE)
						.filter((x) => x.isConnected);
					if (!chunk.length) continue;

					await mathWindow.MathJax.typesetPromise(chunk);
					for (const el of chunk) {
						postProcessTypeset(el);
						const cacheKey = el.getAttribute('data-math-cache-key');
						if (cacheKey) {
							setCachedHtml(cacheKey, el.innerHTML);
						}
					}

					// Yield back to browser between chunks so UI remains responsive.
					if (i + TYPESET_BATCH_SIZE < elements.length) {
						await new Promise<void>((resolve) => setTimeout(resolve, 0));
					}
				}
			}
		} finally {
			flushRunning = false;
			// If new requests came in while we were running, schedule again.
			if (pending.size) scheduleFlush();
		}
	}

	// Expose a singleton manager to all <MathText /> instances (module-scoped closures).
	(globalThis as any).__pro_exam_mathTextMjMgr_v1 = {
		requestTypeset,
		cancelTypeset,
		renderedCache,
		getCachedHtml,
		setCachedHtml
	};
</script>

<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';

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

	let { content, disableCache = false } = $props<{
		content: string;
		disableCache?: boolean;
	}>();

	let container: HTMLSpanElement;
	let loaded = false;
	let lastRendered = '';
	let lastCacheKey = '';

	// Lazy typesetting: only ask MathJax to typeset this element once it's near
	// the viewport. Hundreds of off-screen MathText instances queueing
	// simultaneously can crash the renderer (SIGILL) due to memory pressure
	// from the resulting SVG output.
	let isVisible = false;
	let typesetPending = false;
	let intersectionObserver: IntersectionObserver | null = null;

	function containsMathSyntax(input: string) {
		if (!input) return false;
		return (
			input.includes('<math') ||
			input.includes('\\begin{') ||
			input.includes('\\(') ||
			input.includes('\\[') ||
			input.includes('$$') ||
			input.includes('$') ||
			/\\[a-zA-Z]+/.test(input)
		);
	}

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
		// Use CHTML output instead of SVG to reduce memory pressure and avoid
		// renderer crashes on long solution pages with many formulas.
		const desiredScript = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js';
		const existingScript = document.querySelector(
			'script[data-mathjax="true"]'
		) as HTMLScriptElement | null;
		const existingScriptIsDesired = Boolean(existingScript?.src?.includes('tex-mml-chtml.js'));
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
			chtml: {},
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

		const contentStr = String(content ?? '');

		// Cache key – you can tweak if needed (e.g. include theme).
		const cacheKey = disableCache ? '' : content;
		lastCacheKey = cacheKey;

		// Fast path: reuse already typeset HTML for identical content.
		const manager = (globalThis as any).__pro_exam_mathTextMjMgr_v1 as
			| {
					renderedCache?: Map<string, string>;
					requestTypeset?: (el: HTMLElement) => void;
					getCachedHtml?: (key: string) => string | undefined;
			  }
			| undefined;
		const cachedHtml = disableCache
			? undefined
			: manager?.getCachedHtml?.(cacheKey) ?? manager?.renderedCache?.get(cacheKey);

		await tick();

		if (cachedHtml) {
			container.innerHTML = cachedHtml;
			container.setAttribute('data-math-state', 'ready');
		} else {
			const hasMathSyntax = containsMathSyntax(contentStr);
			// Set pending state before injecting raw source to avoid one-frame flashes.
			container.setAttribute('data-math-state', hasMathSyntax ? 'pending' : 'ready');
			container.innerHTML = content;
			normalizeMfenced(container);
			normalizeMathDisplay(container);
			if (cacheKey) {
				container.setAttribute('data-math-cache-key', cacheKey);
			} else {
				container.removeAttribute('data-math-cache-key');
			}
		}

		lastRendered = content;
		// Debounced/batched typesetting to avoid MathJax backlog. Only request
		// when this element is near the viewport — otherwise mark as pending
		// and let the IntersectionObserver trigger the request later.
		if (!cachedHtml) {
			if (isVisible) {
				manager?.requestTypeset?.(container);
			} else {
				typesetPending = true;
			}
		}
	}

	function setupIntersectionObserver() {
		if (typeof window === 'undefined') return;
		if (!container || intersectionObserver) return;
		// If IntersectionObserver isn't supported, render eagerly.
		if (typeof IntersectionObserver === 'undefined') {
			isVisible = true;
			return;
		}
		intersectionObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						isVisible = true;
						intersectionObserver?.disconnect();
						intersectionObserver = null;
						if (typesetPending) {
							typesetPending = false;
							const manager = (globalThis as any).__pro_exam_mathTextMjMgr_v1 as
								| { requestTypeset?: (el: HTMLElement) => void }
								| undefined;
							manager?.requestTypeset?.(container);
						}
						break;
					}
				}
			},
			{ rootMargin: '120px 0px', threshold: 0 }
		);
		intersectionObserver.observe(container);
	}

	onMount(async () => {
		setupIntersectionObserver();
		await loadMathJax();
		await renderMath();
	});

	onDestroy(() => {
		// If a section changes quickly, ensure this <MathText /> doesn't keep its
		// element in the pending typeset batch.
		if (container) (globalThis as any).__pro_exam_mathTextMjMgr_v1?.cancelTypeset?.(container);
		intersectionObserver?.disconnect();
		intersectionObserver = null;
	});

	$effect(() => {
		content;
		if (loaded) {
			renderMath();
		}
	});
</script>
<span bind:this={container} class="math-text"></span>

<style>
	.math-text {
		display: inline;
		vertical-align: baseline;
		font-size: 1rem;
		white-space: normal;
		overflow-wrap: anywhere;
		word-break: break-word;
		max-width: 100%;
	}

	.math-text[data-math-state='pending'] {
		position: relative;
		color: transparent !important;
	}

	.math-text[data-math-state='pending'] :global(*) {
		opacity: 0 !important;
	}

	.math-text[data-math-state='pending']::after {
		content: 'Rendering math...';
		position: absolute;
		inset: 0 auto auto 0;
		color: var(--pyq-paper-meta, #9ca3af);
		font-size: 0.85em;
		font-weight: 500;
		opacity: 1;
	}

	.math-text :global(table) {
		width: 100% !important;
		table-layout: fixed !important;
		border-collapse: collapse !important;
		margin: 0.5rem 0 !important;
	}

	.math-text :global(th),
	.math-text :global(td) {
		border: 1px solid #ccc !important;
		padding: 0.5rem !important;
		word-break: break-word !important;
		overflow-wrap: anywhere !important;
		vertical-align: top !important;
		text-align: left !important;
		white-space: normal !important;
	}

	/* Optional: Narrow columns for labels (A, B, C...) */
	.math-text :global(td:first-child),
	.math-text :global(td:nth-child(3)) {
		width: 3rem !important;
	}

	/* MathJax SVG output — keep everything inline */
	.math-text :global(mjx-container) {
		display: inline-block;
		max-width: 100%;
		overflow-x: auto;
		overflow-y: hidden;
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

	/* Respect paragraph/newline structure for explanation/solution text. */
	.math-text :global(p) {
		display: block;
		margin: 0.45em 0;
	}

	.math-text :global(math.math-multiline-inline) {
		display: inline-block;
		vertical-align: middle;
		margin: 0 0.2em;
	}
</style>