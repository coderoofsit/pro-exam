import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type SubscriptionPlan = {
	_id: string;
	role: string;
	tier: number;
	__v?: number;
	createdAt: string;
	currency: string;
	description: string[];
	durationDays: number;
	isActive: boolean;
	isTrial: boolean;
	name: string;
	order: number;
	price: number;
	updatedAt: string;
};

export type SubscriptionPlansResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: SubscriptionPlan[];
};

export type SubscriptionCheckoutResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: {
		transactionId: string;
		razorpayKeyId: string;
		orderId: string;
		amount: number;
		currency: string;
		receipt: string;
	};
};

export type VerifySubscriptionPaymentResponseBody = {
	success?: boolean;
	statusCode?: number;
	message?: string;
	data?: unknown;
};

export function sortSubscriptionPlans(list: SubscriptionPlan[]): SubscriptionPlan[] {
	return [...list].sort((a, b) => {
		const o = (a.order ?? 0) - (b.order ?? 0);
		if (o !== 0) return o;
		return (a.tier ?? 0) - (b.tier ?? 0);
	});
}

export async function fetchSubscriptionPlans(
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	const t = resolveApiToken(options?.token ?? null);
	return apiRequest<SubscriptionPlansResponseBody>({
		endpoint: '/api/v1/subscription-plans',
		method: 'GET',
		fetch: fetchFn,
		token: t
	});
}

export async function startFreeTrial(params: {
	planId: string;
	token?: string | null;
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<{ success?: boolean; message?: string; data?: unknown }>({
		endpoint: '/api/v1/subscription-transactions/free-trail',
		method: 'POST',
		data: { planId: params.planId },
		token: t
	});
}

export async function createSubscriptionCheckout(params: {
	planId: string;
	token?: string | null;
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<SubscriptionCheckoutResponseBody>({
		endpoint: '/api/v1/subscription-transactions/checkout',
		method: 'POST',
		data: { planId: params.planId },
		token: t
	});
}

export async function verifySubscriptionPayment(params: {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
	token?: string | null;
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<VerifySubscriptionPaymentResponseBody>({
		endpoint: '/api/v1/subscription-transactions/verify',
		method: 'POST',
		data: {
			razorpay_order_id: params.razorpay_order_id,
			razorpay_payment_id: params.razorpay_payment_id,
			razorpay_signature: params.razorpay_signature
		},
		token: t
	});
}

/** GET /api/v1/subscription — last subscription for the authenticated user. */
export type SubscriptionPlanSnapshot = {
	tier: number;
	role: string;
	name: string;
	durationDays: number;
	currency: string;
	price: number;
	isTrial: boolean;
};

export type SubscriptionPeriod = {
	planId: string;
	planSnapshot: SubscriptionPlanSnapshot;
	purchasedAt: string;
	startsAt: string;
	endsAt: string;
	source: string;
	isTrial: boolean;
};

export type UserSubscriptionRecord = {
	_id: string;
	userId: string;
	startsDate: string;
	endsDate: string;
	status: string;
	autoRenew: boolean;
	canceledAt: string | null;
	cancelReason: string | null;
	current: SubscriptionPeriod;
	next: SubscriptionPeriod[];
	subscriptionExpiredNotifiedAt?: string | null;
	preExpiredNotifiedAt?: string | null;
	createdAt: string;
	updatedAt: string;
	__v?: number;
};

export type UserSubscriptionApiBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: UserSubscriptionRecord | null;
};

export async function fetchUserSubscription(options?: {
	token?: string | null;
	fetch?: typeof fetch;
}) {
	const t = resolveApiToken(options?.token ?? null);
	return apiRequest<UserSubscriptionApiBody>({
		endpoint: '/api/v1/subscription',
		method: 'GET',
		fetch: options?.fetch,
		token: t
	});
}

/** PATCH /api/v1/subscription/auto-renew/:id — enable / disable auto-renew. */
export type SubscriptionAutoRenewPatchBody = {
	success: boolean;
	statusCode: number;
	message: string;
};

export async function patchSubscriptionAutoRenew(params: {
	subscriptionId: string;
	autoRenew: boolean;
	token?: string | null;
}) {
	const id = encodeURIComponent(params.subscriptionId.trim());
	return apiRequest<SubscriptionAutoRenewPatchBody>({
		endpoint: `/api/v1/subscription/auto-renew/${id}`,
		method: 'PATCH',
		data: { autoRenew: params.autoRenew },
	});
}

/** GET …/get-all-transaction — payment history for the current user. */
export type SubscriptionTransactionItem = {
	_id: string;
	status: string;
	amount: number;
	currency: string;
	provider: string;
	failureReason: string | null;
	createdAt: string;
	providerPaymentId?: string;
};

export type SubscriptionTransactionsListBody = {
	success: boolean;
	statusCode?: number;
	message?: string;
	data: SubscriptionTransactionItem[];
};

export async function fetchSubscriptionTransactions(options?: {
	token?: string | null;
	fetch?: typeof fetch;
}) {
	const t = resolveApiToken(options?.token ?? null);
	return apiRequest<SubscriptionTransactionsListBody>({
		endpoint: '/api/v1/subscription-transactions/get-all-transaction',
		method: 'GET',
		fetch: options?.fetch,
		token: t
	});
}