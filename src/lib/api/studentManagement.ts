import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type TeacherIndependentStudent = {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	isActive?: boolean;
	stats?: unknown;
	createdAt?: string;
};

export type TeacherInstituteStudent = {
	_id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	phone?: string;
	isActive?: boolean;
	stats?: unknown;
	createdAt?: string;
};

export type TeacherInstituteStudentRow = {
	method?: string;
	createdAt?: string;
	student: TeacherInstituteStudent;
};

export type TeacherStudentsRow = TeacherIndependentStudent | TeacherInstituteStudentRow;

export type GetTeacherStudentsResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data?: {
		mode: string;
		currentPage: number;
		lastPage: number;
		total: number;
		data: TeacherStudentsRow[];
	};
	error?: any;
};

export type TeacherStudentsActionResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data?: {
		requested?: number;
		blocked?: number;
		unblocked?: number;
		removedStudents?: number;
		invalidIds?: string[];
	};
	error?: any;
};

export type ImportStudentsFromFileResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data?: {
		created?: {
			students: Array<{ email: string; userId: any }>;
			tempPassword: string;
		};
		linked: { students: number };
		skipped: { students: Array<{ email: string; reason: string }> };
	};
	error?: any;
};

export async function importStudentsFromFile(params: {
	file: File;
	token?: string | null;
	fetchFn?: typeof fetch;
}) {
	const t = resolveApiToken(params.token ?? null);
	const formData = new FormData();
	formData.append('file', params.file);

	return apiRequest<ImportStudentsFromFileResponseBody>({
		endpoint: '/api/v1/teacher/import-students',
		method: 'POST',
		data: formData,
		fetch: params.fetchFn,
		token: t
	});
}

export async function getTeacherStudents(params: {
	token?: string | null;
	fetchFn?: typeof fetch;
	page?: number;
	limit?: number;
	search?: string;
	isActive?: boolean | string;
}) {
	const t = resolveApiToken(params.token ?? null);
	const qs = new URLSearchParams();

	if (params.page != null) qs.set('page', String(params.page));
	if (params.limit != null) qs.set('limit', String(params.limit));
	if (typeof params.search === 'string' && params.search.trim()) qs.set('search', params.search.trim());
	if (params.isActive != null) qs.set('isActive', String(params.isActive));

	const query = qs.toString();
	const endpoint = query ? `/api/v1/teacher/students?${query}` : '/api/v1/teacher/students';

	return apiRequest<GetTeacherStudentsResponseBody>({
		endpoint,
		method: 'GET',
		fetch: params.fetchFn,
		token: t
	});
}

export async function blockStudents(params: {
	token?: string | null;
	fetchFn?: typeof fetch;
	students: string[];
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<TeacherStudentsActionResponseBody>({
		endpoint: '/api/v1/teacher/students/block',
		method: 'PATCH',
		data: { students: params.students },
		fetch: params.fetchFn,
		token: t
	});
}

export async function unblockStudents(params: {
	token?: string | null;
	fetchFn?: typeof fetch;
	students: string[];
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<TeacherStudentsActionResponseBody>({
		endpoint: '/api/v1/teacher/students/unblock',
		method: 'PATCH',
		data: { students: params.students },
		fetch: params.fetchFn,
		token: t
	});
}

export async function removeStudents(params: {
	token?: string | null;
	fetchFn?: typeof fetch;
	students: string[];
}) {
	const t = resolveApiToken(params.token ?? null);
	return apiRequest<TeacherStudentsActionResponseBody>({
		endpoint: '/api/v1/teacher/students/remove',
		method: 'PATCH',
		data: { students: params.students },
		fetch: params.fetchFn,
		token: t
	});
}
