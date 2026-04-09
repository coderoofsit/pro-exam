import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';
import { fetchGroupedChaptersByExamSlug, type GroupedSubjectRow } from '$lib/api/chapters';
import { fetchExamBySlug } from '$lib/api/exams';
import { fetchTopicsByExamSlug, type TopicsByExamSubjectRow } from '$lib/api/topics';
import type { PageServerLoad } from './$types';

function boardIdFromExam(exam: Record<string, unknown> | null): string {
	if (!exam || typeof exam !== 'object') return '';
	const board = exam.board;
	if (typeof board === 'string' && board.trim()) return board.trim();
	if (board && typeof board === 'object' && '_id' in board && typeof (board as { _id?: unknown })._id === 'string') {
		return ((board as { _id: string })._id ?? '').trim();
	}
	const id = exam.boardId;
	return typeof id === 'string' ? id.trim() : '';
}

export const load: PageServerLoad = async ({ params, fetch, cookies }) => {
	const { examSlug } = params;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	const [chaptersResponse, topicsResponse, examResult] = await Promise.all([
		fetchGroupedChaptersByExamSlug(examSlug, fetch, token),
		fetchTopicsByExamSlug(examSlug, fetch, token),
		fetchExamBySlug(examSlug, token, fetch).catch(() => null)
	]);

	if (!chaptersResponse.success) {
		return {
			examSlug,
			groupedSubjects: [] as GroupedSubjectRow[],
			groupedTopicSubjects: topicsResponse.success
				? ((topicsResponse.data?.data ?? []) as TopicsByExamSubjectRow[])
				: ([] as TopicsByExamSubjectRow[]),
			error: chaptersResponse.message || 'Failed to fetch chapters',
			topicsError: topicsResponse.success ? null : topicsResponse.message || 'Failed to fetch topics',
			examId: '',
			boardId: ''
		};
	}

	const body = chaptersResponse.data;
	let groupedSubjects: GroupedSubjectRow[] = body.data ?? [];
	const groupedTopicSubjects: TopicsByExamSubjectRow[] = topicsResponse.success
		? topicsResponse.data?.data ?? []
		: [];

	const examIdFallback = (examResult?._id ?? '').trim();
	const boardIdFallback = boardIdFromExam(examResult);

	// Grouped chapters API may omit examId/boardId; test creation requires both.
	if (examIdFallback || boardIdFallback) {
		groupedSubjects = groupedSubjects.map((row) => ({
			...row,
			examId: (row.examId ?? '').trim() || examIdFallback,
			boardId: (row.boardId ?? '').trim() || boardIdFallback
		}));
	}

	return {
		examSlug,
		groupedSubjects,
		groupedTopicSubjects,
		error: null as string | null,
		topicsError: topicsResponse.success ? null : topicsResponse.message || 'Failed to fetch topics',
		examId: examIdFallback,
		boardId: boardIdFallback
	};
};
