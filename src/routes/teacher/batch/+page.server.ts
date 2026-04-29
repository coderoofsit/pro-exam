import { fetchBatches, type StudentBatchItem } from '$lib/api/batch';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import type { PageServerLoad } from './$types';

const LIMIT = 25;

export const load: PageServerLoad = async ({ fetch, url, cookies }) => {
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
	const token = getAuthTokenFromCookies(cookies);

	return {
		search: url.searchParams.get('search') ?? '',
		page: pageNum,
		limit: LIMIT,
		streamed: {
			batchesData: fetchBatches(fetch, { token })
				.then((res) => {
					if (!res.success || !Array.isArray(res.data?.data)) return null;
					const rows = res.data.data;
					const filtered = search
						? rows.filter((row) => row.name?.toLowerCase().includes(search))
						: rows;

					const total = filtered.length;
					const lastPage = Math.max(1, Math.ceil(total / LIMIT));
					const safePage = Math.min(pageNum, lastPage);
					const start = (safePage - 1) * LIMIT;
					const pageRows = filtered.slice(start, start + LIMIT);

					const mapped: StudentBatchItem[] = pageRows.map((row) => ({
						_id: row._id,
						name: row.name,
						slug: row.slug,
						numberOfStudents: row.numberOfStudents ?? 0,
						numberOfTeachers: row.numberOfTeachers ?? 0,
						numberOfTests: row.numberOfTests ?? 0,
						startDate: row.startDate,
						startTime: row.startTime,
						endDate: row.endDate,
						endTime: row.endTime,
						status: row.status,
						isActive: row.status?.toLowerCase() !== 'closed',
						createdByUser: {
							_id: row.createdByUserId?._id ?? '',
							firstName: row.createdByUserId?.firstName ?? '',
							lastName: row.createdByUserId?.lastName ?? ''
						}
					}));

					return {
						success: true,
						statusCode: 200,
						message: 'Batches fetched successfully',
						currentPage: safePage,
						lastPage,
						total,
						data: mapped
					};
				})
				.catch(() => null)
		},
		ssrAuthMissing: !token
	};
};
