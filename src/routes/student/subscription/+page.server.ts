import type { PageServerLoad } from './$types';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import { fetchSubscriptionPlans, fetchUserSubscription, sortSubscriptionPlans } from '$lib/api/subscription';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;

	return {
		streamed: {
			subscription: fetchUserSubscription({ token, fetch })
				.then((res) => (res.success ? (res.data?.data ?? null) : null))
				.catch(() => null),
			plans: fetchSubscriptionPlans(fetch, { token })
				.then((res) => (res.success ? sortSubscriptionPlans(res.data?.data ?? []) : []))
				.catch(() => [])
		}
	};
};
