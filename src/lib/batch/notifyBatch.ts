import { notifyError, notifySuccess } from '$lib/notifications';

export function showBatchError(message: string | null | undefined): void {
	const text = message?.trim();
	if (text) notifyError(text);
}

export function showBatchSuccess(message: string | null | undefined, fallback?: string): void {
	const text = message?.trim() || fallback?.trim();
	if (text) notifySuccess(text);
}
