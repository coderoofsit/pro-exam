import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';
import {
	getMembershipsDetail,
	getMembershipUsers,
	normalizeMembershipProfileRef,
	type GetMembershipsResponse
} from '$lib/api/auth';

export async function loadSettingsProfile(cookies: Cookies, fetch: typeof globalThis.fetch) {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	if (!token?.trim()) {
		throw redirect(302, '/');
	}

	const membersRes = await getMembershipUsers(fetch, token);

	let profileData: GetMembershipsResponse['data'] | null = null;

	if (membersRes.success) {
		const body = membersRes.data as { data?: { users?: Array<{ _id?: string; defaultProfile?: boolean; userProfileId?: unknown }> } };
		const users = body?.data?.users ?? [];
		const defaultUser = users.find((u) => u.defaultProfile) ?? users[0] ?? null;

		const { userProfileId: userProfiledId } = normalizeMembershipProfileRef(
			defaultUser?.userProfileId
		);

		if (defaultUser?._id && userProfiledId) {
			const detailRes = await getMembershipsDetail({
				membershipId: defaultUser._id,
				userProfiledId,
				token
			});

			if (detailRes.success) {
				const detailBody = detailRes.data as GetMembershipsResponse;
				profileData = detailBody?.data ?? null;
			}
		}
	}

	return { profileData };
}
