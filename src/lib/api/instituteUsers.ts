import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type InstituteUserProfileRef = {
	_id?: string;
	email?: string;
	phone?: string;
};

export type InstituteUserRow = {
	_id: string;
	firstName?: string;
	lastName?: string;
	batchApproved?: boolean;
	isActive?: boolean;
	userProfileId?: InstituteUserProfileRef | null;
};

export type InstituteUsersPagePayload = {
	currentPage: number;
	lastPage: number;
	total: number;
	data: InstituteUserRow[];
};

export type InstituteUsersListApiBody = {
	success?: boolean;
	statusCode?: number;
	message?: string;
	data?: InstituteUsersPagePayload;
};

export async function fetchInstituteUsers(params: {
	role: 'teacher' | 'student';
	page?: number;
	limit?: number;
	search?: string;
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const qs = new URLSearchParams();
	const page = Math.max(params.page ?? 1, 1);
	const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
	qs.set('page', String(page));
	qs.set('limit', String(limit));
	if (typeof params.search === 'string' && params.search.trim()) {
		qs.set('search', params.search.trim());
	}

	const segment = params.role === 'teacher' ? 'teachers' : 'students';
	const endpoint = `/api/v1/institute/${segment}?${qs.toString()}`;

	return apiRequest<InstituteUsersListApiBody>({
		endpoint,
		method: 'GET',
		fetch: params.fetchFn,
		token: t
	});
}

/** Resolve pagination payload from `apiRequest` success (`outer.data` = API JSON body). */
export function unwrapInstituteUsersPage(res: {
	success: boolean;
	data?: InstituteUsersListApiBody | null;
}): InstituteUsersPagePayload | null {
	if (!res.success || !res.data?.data) return null;
	const inner = res.data.data;
	if (!Array.isArray(inner.data)) return null;
	return inner;
}

export type RemoveInstituteUsersApiBody = {
	success?: boolean;
	message?: string;
};

/** PATCH `/api/v1/institute/remove-users` — send either `teachers` or `students` IDs. */
export async function removeInstituteUsers(params: {
	role: 'teacher' | 'student';
	ids: string[];
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const body =
		params.role === 'teacher'
			? { data: { teachers: params.ids } }
			: { data: { students: params.ids } };

	return apiRequest<RemoveInstituteUsersApiBody>({
		endpoint: '/api/v1/institute/remove-users',
		method: 'PATCH',
		data: body,
		fetch: params.fetchFn,
		token: t
	});
}
