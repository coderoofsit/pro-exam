declare global {
	interface Window {
		Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
	}
}

export type RazorpaySuccessPayload = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

type RazorpayFailurePayload = {
	error?: {
		code?: string;
		description?: string;
		source?: string;
		step?: string;
		reason?: string;
		metadata?: {
			order_id?: string;
			payment_id?: string;
		};
	};
};

type RazorpayOptions = {
	key: string;
	order_id: string;
	amount: number;
	currency: string;
	name?: string;
	description?: string;
	image?: string;
	prefill?: {
		name?: string;
		email?: string;
		contact?: string;
	};
	notes?: Record<string, string>;
	theme?: {
		color?: string;
	};
	handler: (response: RazorpaySuccessPayload) => void;
	modal?: {
		ondismiss?: () => void;
		escape?: boolean;
		backdropclose?: boolean;
		confirm_close?: boolean;
		animation?: boolean;
	};
};

type RazorpayInstance = {
	open: () => void;
	on: (event: 'payment.failed', callback: (response: RazorpayFailurePayload) => void) => void;
};

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
	if (typeof window === 'undefined') return Promise.resolve(false);
	if (window.Razorpay) return Promise.resolve(true);

	if (razorpayScriptPromise) return razorpayScriptPromise;

	razorpayScriptPromise = new Promise<boolean>((resolve) => {
		const existing = document.querySelector<HTMLScriptElement>(
			'script[data-razorpay-checkout="true"]'
		);

		if (existing) {
			existing.addEventListener('load', () => resolve(true), { once: true });
			existing.addEventListener('error', () => resolve(false), { once: true });
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.async = true;
		script.defer = true;
		script.dataset.razorpayCheckout = 'true';

		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);

		document.head.appendChild(script);
	});

	return razorpayScriptPromise;
}

export type OpenRazorpayCheckoutParams = {
	key: string;
	orderId: string;
	amount: number;
	currency: string;
	name?: string;
	description?: string;
	prefill?: {
		name?: string;
		email?: string;
		contact?: string;
	};
	notes?: Record<string, string>;
	theme?: {
		color?: string;
	};
};

export async function openRazorpayCheckout(
	params: OpenRazorpayCheckoutParams
): Promise<RazorpaySuccessPayload> {
	const loaded = await loadRazorpayScript();

	if (!loaded || !window.Razorpay) {
		throw new Error('Unable to load Razorpay checkout.');
	}

	const Razorpay = window.Razorpay;

	return new Promise<RazorpaySuccessPayload>((resolve, reject) => {
		let settled = false;

		const safeResolve = (value: RazorpaySuccessPayload) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		const safeReject = (error: Error) => {
			if (settled) return;
			settled = true;
			reject(error);
		};

		const instance = new Razorpay({
			key: params.key,
			order_id: params.orderId,
			amount: params.amount,
			currency: params.currency,
			name: params.name ?? 'Exam Abhyas',
			description: params.description ?? 'Subscription purchase',
			prefill: params.prefill,
			notes: params.notes,
			theme: params.theme,
			handler: (response) => {
				safeResolve(response);
			},
			modal: {
				ondismiss: () => {
					safeReject(new Error('Payment popup was closed.'));
				},
				escape: true,
				backdropclose: false,
				confirm_close: true,
				animation: true
			}
		});

		instance.on('payment.failed', (response) => {
			const message =
				response?.error?.description ||
				response?.error?.reason ||
				'Payment failed. Please try again.';
			safeReject(new Error(message));
		});

		instance.open();
	});
}