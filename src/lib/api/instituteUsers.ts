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
	/** When true, appends `relation=true` to the query string (institute student–teacher flows). */
	relation?: boolean;
	/** Teachers list filter — sent as `approved=true|false` (omit when showing all). */
	approved?: boolean;
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
	if (params.relation) {
		qs.set('relation', 'true');
	}
	if (params.role === 'teacher' && typeof params.approved === 'boolean') {
		qs.set('approved', String(params.approved));
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

export type DeleteTeacherStudentsApiBody = {
	success?: boolean;
	message?: string;
	data?: {
		teacherId?: string;
		removedCount?: number;
		removeRequested?: number;
	};
};

/** DELETE `/api/v1/teacher-student-relation/teachers/:teacherId/students` — one or many students. */
export async function deleteInstituteTeacherStudentRelations(params: {
	teacherId: string;
	studentIds: string[];
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const ids = params.studentIds.filter(Boolean);
	const data = ids.length === 1 ? { studentId: ids[0] } : { studentIds: ids };

	return apiRequest<DeleteTeacherStudentsApiBody>({
		endpoint: `/api/v1/teacher-student-relation/teachers/${params.teacherId}/students`,
		method: 'DELETE',
		data,
		fetch: params.fetchFn,
		token: t
	});
}

export function unwrapDeleteTeacherStudentsResult(
	res: {
		success: boolean;
		data?: DeleteTeacherStudentsApiBody | null;
		message?: string;
	},
	requestedCount = 0
): { removedCount: number; message: string } | null {
	if (!res.success) return null;
	const body = res.data;
	const removedCount =
		body?.data?.removedCount ?? (body?.success !== false ? requestedCount : 0);
	if (removedCount <= 0) return null;
	return {
		removedCount,
		message: body?.message || res.message || 'Students removed from teacher.'
	};
}

/** POST `/api/v1/institute/teacher-student-relations` — body `{ teacherId, add?, remove? }`. */
export async function createInstituteTeacherStudentRelations(params: {
	teacherId: string;
	add?: string[];
	remove?: string[];
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const body: { teacherId: string; add?: string[]; remove?: string[] } = {
		teacherId: params.teacherId
	};
	if (params.add?.length) body.add = params.add;
	if (params.remove?.length) body.remove = params.remove;

	return apiRequest<{ success?: boolean; message?: string }>({
		endpoint: '/api/v1/institute/teacher-student-relations',
		method: 'POST',
		data: body,
		fetch: params.fetchFn,
		token: t
	});
}

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

export type InstituteTeacherLinkedStudent = {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	isActive?: boolean;
};

export type InstituteTeacherStudentsApiBody = {
	success?: boolean;
	message?: string;
	data?: {
		teacherId?: string;
		items?: InstituteTeacherLinkedStudent[];
		pagination?: {
			page?: number;
			limit?: number;
			total?: number;
			totalPages?: number;
		};
	};
};

/** GET `/api/v1/teacher-student-relation/teachers/:teacherId/students` — students linked to a teacher. */
export async function fetchInstituteTeacherStudents(params: {
	teacherId: string;
	page?: number;
	limit?: number;
	search?: string;
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const qs = new URLSearchParams();
	const page = Math.max(params.page ?? 1, 1);
	const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
	qs.set('page', String(page));
	qs.set('limit', String(limit));
	if (typeof params.search === 'string' && params.search.trim()) {
		qs.set('search', params.search.trim());
	}

	return apiRequest<InstituteTeacherStudentsApiBody>({
		endpoint: `/api/v1/teacher-student-relation/teachers/${params.teacherId}/students?${qs.toString()}`,
		method: 'GET',
		fetch: params.fetchFn,
		token: t
	});
}

export function unwrapInstituteTeacherStudentsPage(res: {
	success: boolean;
	data?: InstituteTeacherStudentsApiBody | null;
}): {
	items: InstituteTeacherLinkedStudent[];
	page: number;
	lastPage: number;
	total: number;
} | null {
	if (!res.success || !res.data?.data) return null;
	const inner = res.data.data;
	const items = Array.isArray(inner.items) ? inner.items : [];
	const pagination = inner.pagination;
	const page = pagination?.page ?? 1;
	const lastPage = pagination?.totalPages ?? 1;
	const total = pagination?.total ?? items.length;
	return { items, page, lastPage, total };
}

/** PATCH `/api/v1/institute/teachers/:teacherId/batch-approval` */
export async function updateTeacherBatchApproval(params: {
	teacherId: string;
	batchApproved: boolean;
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);

	return apiRequest<{ success?: boolean; message?: string }>({
		endpoint: `/api/v1/institute/teachers/${params.teacherId}/batch-approval`,
		method: 'PATCH',
		data: { batchApproved: params.batchApproved },
		fetch: params.fetchFn,
		token: t
	});
}
