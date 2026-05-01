import {
	fetchBatches,
	fetchBatchTeachersItems,
	fetchBatchStudentsItems,
	fetchBatchTestsItems,
	removeBatchItems,
	type BatchTeacherItem,
	type BatchStudentItem,
	type BatchTestListItem
} from '$lib/api/batch';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';

const DEFAULT_LIMIT = 20;

export const load: PageServerLoad = async ({ params, fetch, cookies, url }) => {
	const batchSlug = (params.batchSlug ?? '').trim();
	const token = getAuthTokenFromCookies(cookies) ?? null;
	const teacherPage = Math.max(
		parseInt(url.searchParams.get('teacherPage') ?? '1', 10) || 1,
		1
	);
	const studentPage = Math.max(
		parseInt(url.searchParams.get('studentPage') ?? '1', 10) || 1,
		1
	);
	const testPage = Math.max(
		parseInt(url.searchParams.get('testPage') ?? '1', 10) || 1,
		1
	);
	const limit = Math.min(
		Math.max(parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
		DEFAULT_LIMIT
	);
	const search = (url.searchParams.get('search') ?? '').trim();

	return {
		ssrAuthMissing: !token?.trim(),
		actionError: url.searchParams.get('actionError'),
		streamed: {
			teachersData: token?.trim()
				? (async () => {
						const batchesRes = await fetchBatches(fetch, { token });
						if (!batchesRes.success || !Array.isArray(batchesRes.data?.data)) return null;

						const batch = batchesRes.data.data.find((b) => b.slug === batchSlug || b._id === batchSlug);
						if (!batch?._id) {
							return {
								batch: null as { id: string; name: string; slug: string } | null,
								data: [] as BatchTeacherItem[],
								currentPage: 1,
								lastPage: 1
							};
						}

						const [teachersRes, studentsRes, testsRes] = await Promise.all([
							fetchBatchTeachersItems(
								batch._id,
								{ page: teacherPage, limit, search: search || undefined },
								fetch,
								{ token }
							),
							fetchBatchStudentsItems(
								batch._id,
								{ page: studentPage, limit, search: search || undefined },
								fetch,
								{ token }
							),
							fetchBatchTestsItems(
								batch._id,
								{ page: testPage, limit, search: search || undefined },
								fetch,
								{ token }
							)
						]);

						const fallbackData = {
							data: [],
							currentPage: 1,
							lastPage: 1
						};

						const teachers = teachersRes.success && teachersRes.data?.data
							? {
									data: teachersRes.data.data.items ?? [],
									currentPage: teachersRes.data.data.pagination?.page ?? 1,
									lastPage: teachersRes.data.data.pagination?.totalPages ?? 1
								}
							: {
									...fallbackData,
									data: [] as BatchTeacherItem[]
								};

						const students = studentsRes.success && studentsRes.data?.data
							? {
									data: studentsRes.data.data.items ?? [],
									currentPage: studentsRes.data.data.pagination?.page ?? 1,
									lastPage: studentsRes.data.data.pagination?.totalPages ?? 1
								}
							: {
									...fallbackData,
									data: [] as BatchStudentItem[]
								};

						const tests = testsRes.success && testsRes.data?.data
							? {
									data: testsRes.data.data.items ?? [],
									currentPage: testsRes.data.data.pagination?.page ?? 1,
									lastPage: testsRes.data.data.pagination?.totalPages ?? 1
								}
							: {
									...fallbackData,
									data: [] as BatchTestListItem[]
								};

						const batchMeta =
							teachersRes.success && teachersRes.data?.data
								? {
										id: teachersRes.data.data.batchDetails?.batchId ?? batch._id,
										name: teachersRes.data.data.batchDetails?.name ?? batch.name,
										slug: teachersRes.data.data.batchDetails?.slug ?? batch.slug,
										startDate: teachersRes.data.data.batchDetails?.startDate ?? '',
										endDate: teachersRes.data.data.batchDetails?.endDate ?? '',
										startTime: teachersRes.data.data.batchDetails?.startTime ?? '',
										endTime: teachersRes.data.data.batchDetails?.endTime ?? '',
										maxCapacity: teachersRes.data.data.batchDetails?.maxCapacity ?? 0,
										numberOfStudents:
											teachersRes.data.data.batchDetails?.numberOfStudents ?? 0,
										numberOfTeachers:
											teachersRes.data.data.batchDetails?.numberOfTeachers ?? 0,
										numberOfTests: teachersRes.data.data.batchDetails?.numberOfTests ?? 0,
										status: teachersRes.data.data.batchDetails?.status ?? ''
									}
								: {
										id: batch._id,
										name: batch.name,
										slug: batch.slug,
										startDate: batch.startDate ?? '',
										endDate: batch.endDate ?? '',
										startTime: batch.startTime ?? '',
										endTime: batch.endTime ?? '',
										maxCapacity: batch.maxCapacity ?? 0,
										numberOfStudents: batch.numberOfStudents ?? 0,
										numberOfTeachers: batch.numberOfTeachers ?? 0,
										numberOfTests: batch.numberOfTests ?? 0,
										status: batch.status ?? ''
									};

						return {
							batch: batchMeta,
							teachers,
							students,
							tests
						};
					})()
				: Promise.resolve(null)
		}
	};
};

export const actions: Actions = {
	removeSelected: async ({ request, cookies, fetch }) => {
		const token = getAuthTokenFromCookies(cookies) ?? null;
		if (!token?.trim()) return fail(401, { message: 'Missing auth token' });

		const form = await request.formData();
		const batchId = String(form.get('batchId') ?? '').trim();
		const removeTeachers = form
			.getAll('teachers')
			.map((v) => String(v).trim())
			.filter(Boolean);
		const removeStudents = form
			.getAll('students')
			.map((v) => String(v).trim())
			.filter(Boolean);
		const removeTests = form
			.getAll('tests')
			.map((v) => String(v).trim())
			.filter(Boolean);

		if (!batchId) return fail(400, { message: 'Missing batch id' });
		if (!removeTeachers.length && !removeStudents.length && !removeTests.length) {
			return fail(400, { message: 'Select at least one item to remove' });
		}
		if (removeTeachers.length > 0) {
			const teachersRes = await fetchBatchTeachersItems(
				batchId,
				{ page: 1, limit: 1 },
				fetch,
				{ token }
			);
			const totalTeachers = teachersRes.success
				? (teachersRes.data?.data?.pagination?.totalItems ??
					teachersRes.data?.data?.items?.length ??
					0)
				: 0;
			if (totalTeachers > 0 && removeTeachers.length >= totalTeachers) {
				return fail(400, { message: 'At least one teacher must remain in the batch' });
			}
		}

		const res = await removeBatchItems(
			batchId,
			{
				removeTeachers,
				removeStudents,
				removeTests
			},
			fetch,
			{ token }
		);

		if (!res.success) {
			return fail(400, { message: res.message || 'Could not remove selected items' });
		}

		return { success: true };
	}
};
