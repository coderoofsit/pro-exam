import {
	fetchStudentBatchDetail,
	type StudentBatchAssignedTest,
	type StudentBatchDetailPayload
} from '$lib/api/batch';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 20;

export const load: PageServerLoad = async ({ params, fetch, cookies, url }) => {
	const batchId = (params.batchId ?? '').trim();
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);

	const token = getAuthTokenFromCookies(cookies);

	if (!batchId) {
		return {
			batch: null as StudentBatchDetailPayload['batch'] | null,
			tests: [] as StudentBatchAssignedTest[],
			error: 'Invalid batch link.',
			batchId,
			ssrAuthMissing: false as const,
			currentPage: 1,
			lastPage: 1,
			total: 0,
			limit: DEFAULT_LIMIT
		};
	}

	if (!token) {
		return {
			batch: null,
			tests: [],
			error: null as string | null,
			batchId,
			ssrAuthMissing: true as const,
			currentPage: 1,
			lastPage: 1,
			total: 0,
			limit: DEFAULT_LIMIT
		};
	}

	const res = await fetchStudentBatchDetail(
		batchId,
		{ page: pageNum, limit: DEFAULT_LIMIT },
		fetch,
		{ token }
	);

	if (!res.success) {
		return {
			batch: null,
			tests: [],
			error: res.message,
			batchId,
			ssrAuthMissing: false as const,
			currentPage: 1,
			lastPage: 1,
			total: 0,
			limit: DEFAULT_LIMIT
		};
	}

	const body = res.data;
	const payload = body.data;

	return {
		batch: payload.batch,
		tests: payload.data ?? [],
		error: null as string | null,
		batchId,
		ssrAuthMissing: false as const,
		currentPage: payload.currentPage ?? 1,
		lastPage: payload.lastPage ?? 1,
		total: payload.total ?? 0,
		limit: payload.limit ?? DEFAULT_LIMIT
	};
};
