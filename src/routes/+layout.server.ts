import type { LayoutServerLoad } from './$types';
import { getMembershipUsers, type MembershipUser } from '$lib/api/auth';
import { AUTH_STORAGE_KEY } from '$lib/stores/auth';

function extractMembershipUsers(payload: unknown): MembershipUser[] {
	const body = payload as
		| {
				ok?: boolean;
				success?: boolean;
				data?: { users?: MembershipUser[] };
		  }
		| null
		| undefined;

	if (!body) return [];
	const ok = body.ok === true || body.success === true;
	if (!ok) return [];
	return Array.isArray(body.data?.users) ? body.data.users : [];
}

export const load: LayoutServerLoad = async ({ cookies, fetch }) => {
	const token = cookies.get(AUTH_STORAGE_KEY) ?? null;
	if (!token?.trim()) {
		return {
			authToken: null,
			membershipUsers: []
		};
	}

	try {
		const res = await getMembershipUsers(fetch, token);
		return {
			authToken: token,
			membershipUsers: res.success ? extractMembershipUsers(res.data) : []
		};
	} catch {
		return {
			authToken: token,
			membershipUsers: []
		};
	}
};
