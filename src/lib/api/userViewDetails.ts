import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type UserViewDetailsRole = 'teacher' | 'student';

export type UserViewDetailsBatch = {
	_id: string;
	name: string;
	slug: string;
	numberOfStudents?: number;
	numberOfTeachers?: number;
	numberOfTests?: number;
	startsAt?: string;
	endsAt?: string;
	status?: string;
};

export type UserViewDetailsTestEntry = {
	batch?: {
		_id?: string;
		name?: string;
		slug?: string;
		status?: string;
		startsAt?: string;
		endsAt?: string;
	};
	test?: {
		_id?: string;
		name?: { en?: string; hi?: string } | string;
		slug?: string;
		kind?: string;
		questionCount?: number;
		totalMarks?: number;
		status?: string;
		settings?: {
			durationMinutes?: number;
			startsAt?: string | null;
			endsAt?: string | null;
		};
	};
};

export type UserViewDetailsPayload = {
	mode?: string;
	summary?: {
		totalBatches?: number;
		totalTestsCreatedInBatches?: number;
	};
	batches?: UserViewDetailsBatch[];
	tests?: UserViewDetailsTestEntry[];
};

export type UserViewDetailsApiBody = {
	success?: boolean;
	message?: string;
	data?: UserViewDetailsPayload;
};

export async function fetchUserViewDetails(params: {
	userId: string;
	role: UserViewDetailsRole;
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const id = params.userId.trim();
	if (!id) {
		return {
			success: false as const,
			message: 'Missing user id',
			status: 400
		};
	}

	return apiRequest<UserViewDetailsApiBody>({
		endpoint: `/api/v1/users/view-details/${encodeURIComponent(id)}/${params.role}`,
		method: 'GET',
		fetch: params.fetchFn,
		token: t
	});
}

export function unwrapUserViewDetails(res: {
	success: boolean;
	data?: UserViewDetailsApiBody | null;
	message?: string;
}): UserViewDetailsPayload | null {
	if (!res.success || !res.data?.data) return null;
	return res.data.data;
}
