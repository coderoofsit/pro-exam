export type SyncAuthSessionInput = {
	token: string;
	role?: string | null;
	fcmToken?: string | null;
	ownedBy?: string | null;
	ownedRole?: string | null;
};

/** Mirror JWT + role + FCM + owned context into httpOnly cookies (SSR + apiRequest). */
export async function syncAuthSessionCookies(input: SyncAuthSessionInput): Promise<boolean> {
	const token = input.token?.trim();
	if (!token) return false;

	try {
		const response = await fetch('/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				token,
				role: input.role ?? '',
				fcmToken: input.fcmToken ?? '',
				ownedBy: input.ownedBy?.trim() ?? '',
				ownedRole: input.ownedRole?.trim() ?? ''
			})
		});
		return response.ok;
	} catch {
		return false;
	}
}
