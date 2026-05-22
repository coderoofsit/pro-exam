import type { LayoutServerLoad } from './$types';
import { deriveOwnedContext, getMembershipUsers, type MembershipUser } from '$lib/api/auth';
import { AUTH_OWNED_BY_KEY, AUTH_OWNED_ROLE_KEY, AUTH_STORAGE_KEY } from '$lib/stores/auth';

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
			membershipUsers: [],
			ownedBy: null,
			ownedRole: null
		};
	}

	try {
		const res = await getMembershipUsers(fetch, token);
		const membershipUsers = res.success ? extractMembershipUsers(res.data) : [];
		const { ownedBy, ownedRole } = deriveOwnedContext({
			ownedBy: cookies.get(AUTH_OWNED_BY_KEY),
			ownedRole: cookies.get(AUTH_OWNED_ROLE_KEY),
			users: membershipUsers
		});
		return {
			authToken: token,
			membershipUsers,
			ownedBy,
			ownedRole
		};
	} catch {
		return {
			authToken: token,
			membershipUsers: [],
			ownedBy: cookies.get(AUTH_OWNED_BY_KEY) ?? null,
			ownedRole: cookies.get(AUTH_OWNED_ROLE_KEY) ?? null
		};
	}
};
