import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import { getMembershipsDetail, getMembershipUsers, type GetMembershipsResponse } from '$lib/api/auth';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	if (!token?.trim()) {
		throw redirect(302, '/');
	}

	const membersRes = await getMembershipUsers(fetch, token);

	let profileData: GetMembershipsResponse['data'] | null = null;

	if (membersRes.success) {
		const body = membersRes.data as any;
		const users: any[] = body?.data?.users ?? [];
		const defaultUser = users.find((u: any) => u.defaultProfile) ?? users[0] ?? null;

		if (defaultUser?._id && defaultUser?.userProfileId) {
			const detailRes = await getMembershipsDetail({
				membershipId: defaultUser._id,
				userProfiledId: defaultUser.userProfileId,
				token
			});

			if (detailRes.success) {
				const detailBody = detailRes.data as GetMembershipsResponse;
				profileData = detailBody?.data ?? null;
			}
		}
	}

	return { profileData };
};
