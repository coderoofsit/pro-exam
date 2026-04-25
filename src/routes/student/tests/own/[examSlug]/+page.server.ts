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

	const topicsResponse = await fetchTopicsByExamSlug(examSlug, fetch, token);

	if (!topicsResponse.success) {
		return {
			examSlug,
			groupedSubjects: [] as GroupedSubjectRow[],
			groupedTopicSubjects: [] as TopicsByExamSubjectRow[],
			error: topicsResponse.message || 'Failed to fetch topics',
			topicsError: topicsResponse.message || 'Failed to fetch topics',
			examId: '',
			boardId: ''
		};
	}

	const groupedTopicSubjects: TopicsByExamSubjectRow[] = topicsResponse.data?.data ?? [];
	const examIdFallback = (groupedTopicSubjects[0]?.subject?.examId ?? '').trim();
	const boardIdFallback = (groupedTopicSubjects[0]?.subject?.boardId ?? '').trim();

	// Transform Topics hierarchy into GroupedChapters hierarchy for Manual Mode UI
	// Hierarchy: Subject -> Chapter (as Unit) -> Topic (as ChapterItem)
	const groupedSubjects: GroupedSubjectRow[] = groupedTopicSubjects.map((row) => ({
		examId: (row.subject.examId ?? '').trim() || examIdFallback,
		boardId: (row.subject.boardId ?? '').trim() || boardIdFallback,
		subject: {
			_id: row.subject._id,
			slug: row.subject.slug,
			name: row.subject.name || { en: row.subject.slug }
		},
		data: row.data.map((chRow) => ({
			chapterGroup: {
				_id: chRow.chapter._id,
				slug: chRow.chapter.slug,
				name: chRow.chapter.name || { en: chRow.chapter.slug }
			},
			data: chRow.data.map((topicRow) => ({
				_id: topicRow._id,
				slug: topicRow.topicSlug,
				name: topicRow.topic || { en: topicRow.topicSlug }
			}))
		}))
	}));

	return {
		examSlug,
		groupedSubjects,
		groupedTopicSubjects,
		error: null as string | null,
		topicsError: null as string | null,
		examId: examIdFallback,
		boardId: boardIdFallback
	};
};
