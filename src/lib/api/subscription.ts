import { apiRequest } from '../../http/api';

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
	return apiRequest<SubscriptionPlansResponseBody>({
		endpoint: '/api/v1/subscription-plans',
		method: 'GET',
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}

/** POST /api/v1/subscription-transactions/free-trail — start free trial for a trial plan. */
export async function startFreeTrial(params: {
	planId: string;
	token?: string | null;
}) {
	return apiRequest<{ success?: boolean; message?: string; data?: unknown }>({
		endpoint: '/api/v1/subscription-transactions/free-trail',
		method: 'POST',
		data: { planId: params.planId },
		token: params.token
	});
}
