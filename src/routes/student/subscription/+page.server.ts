import type { PageServerLoad } from './$types';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import { fetchSubscriptionPlans, fetchUserSubscription, sortSubscriptionPlans } from '$lib/api/subscription';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	const plansRes = await fetchSubscriptionPlans(fetch, { token });
	const plans = plansRes.success ? sortSubscriptionPlans(plansRes.data?.data ?? []) : [];

	return {
		plans,
		streamed: {
			subscription: fetchUserSubscription({ token, fetch })
				.then(res => res.success ? (res.data?.data ?? null) : null)
				.catch(() => null)
		}
	};
};
