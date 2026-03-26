/**
 * Returns a function that calls `fn` only after `waitMs` have passed since the last call.
 * Useful for search fields, resize handlers, and other high-frequency inputs.
 */
export function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	waitMs: number
): (...args: Args) => void {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	return (...args: Args) => {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			timeoutId = undefined;
			fn(...args);
		}, waitMs);
	};
}
