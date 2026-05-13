import { writable } from 'svelte/store';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info' | 'alert';

export type ToastAction = { label: string; href: string };

export type ToastInput = {
	message: string;
	action?: ToastAction;
	/** Defaults to 2000 ms */
	durationMs?: number;
};

export type ToastItem = {
	id: string;
	variant: ToastVariant;
	message: string;
	action?: ToastAction;
	durationMs: number;
};

const DEFAULT_DURATION_MS = 2000;

export const toasts = writable<ToastItem[]>([]);

function randomId(): string {
	return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function dismissToast(id: string): void {
	toasts.update((list) => list.filter((t) => t.id !== id));
}

function push(variant: ToastVariant, input: string | ToastInput): string {
	const resolved: ToastInput =
		typeof input === 'string' ? { message: input } : input;
	const item: ToastItem = {
		id: randomId(),
		variant,
		message: resolved.message,
		action: resolved.action,
		durationMs: resolved.durationMs ?? DEFAULT_DURATION_MS
	};
	toasts.update((list) => [...list, item]);
	return item.id;
}

/** Green success */
export function notifySuccess(input: string | ToastInput): string {
	return push('success', input);
}

/** Red error / danger */
export function notifyError(input: string | ToastInput): string {
	return push('danger', input);
}

export function notifyWarning(input: string | ToastInput): string {
	return push('warning', input);
}

export function notifyInfo(input: string | ToastInput): string {
	return push('info', input);
}

/** Strong orange alert */
export function notifyAlert(input: string | ToastInput): string {
	return push('alert', input);
}
