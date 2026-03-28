import { fetchSubscriptionPlans, sortSubscriptionPlans } from '$lib/api/subscription';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = getAuthTokenFromCookies(cookies);

	if (!token) {
		return {
			plans: [],
			error: null as string | null,
			ssrAuthMissing: true as const
		};
	}

	const res = await fetchSubscriptionPlans(fetch, { token });

	if (!res.success) {
		return {
			plans: [],
			error: res.message,
			ssrAuthMissing: false as const
		};
	}

	const body = res.data;
	const raw = Array.isArray(body?.data) ? body.data : [];
	const plans = sortSubscriptionPlans(raw);

	return {
		plans,
		error: null as string | null,
		ssrAuthMissing: false as const
	};
};
