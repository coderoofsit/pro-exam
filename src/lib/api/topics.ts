import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type TopicRow = {
	_id: string;
	slug: string;
	name?: { en?: string; hi?: string };
};

type TopicsApiBody = {
	success: boolean;
	message: string;
	data: TopicRow[];
};

export type TopicsByExamTopicRow = {
	_id: string;
	topic: { en?: string; hi?: string };
	topicSlug: string;
	order?: number;
	numberOfQuestions: number;
};

export type TopicsByExamChapterRow = {
	chapter: {
		_id: string;
		slug: string;
		name?: { en?: string; hi?: string };
		order?: number;
	};
	data: TopicsByExamTopicRow[];
};

export type TopicsByExamSubjectRow = {
	subject: {
		_id: string;
		slug: string;
		name?: { en?: string; hi?: string };
		examId?: string;
		boardId?: string;
	};
	data: TopicsByExamChapterRow[];
};

type TopicsByExamApiBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: TopicsByExamSubjectRow[];
};

/** GET /api/v1/topics?chapterSlug=… — non-blocking; used on own-test manual chapter page. */
export async function fetchTopicsByChapterSlug(
	chapterSlug: string,
	fetchFn?: typeof fetch,
	opts?: { signal?: AbortSignal; token?: string | null }
): Promise<{ success: boolean; data?: { chapter: any; topics: TopicRow[] }; message?: string }> {
	const res = await apiRequest<{ data: { chapter: any; topics: TopicRow[] } }>({
		endpoint: `/api/v1/topics?chapterSlug=${encodeURIComponent(chapterSlug)}`,
		method: 'GET',
		fetch: fetchFn,
		signal: opts?.signal,
		token: opts?.token
	});
	if (!res.success) {
		return { success: false, message: res.message };
	}
	const body = res.data;
	return {
		success: true,
		data: body?.data
	};
}

/** GET /api/v1/topics?examSlug=... — used by own-test random mode. */
export async function fetchTopicsByExamSlug(
	examSlug: string,
	fetchFn?: typeof fetch,
	token?: string | null
) {
	const t = resolveApiToken(token ?? null);
	return apiRequest<TopicsByExamApiBody>({
		endpoint: `/api/v1/topics?examSlug=${encodeURIComponent(examSlug)}`,
		method: 'GET',
		fetch: fetchFn,
		token: t
	});
}
