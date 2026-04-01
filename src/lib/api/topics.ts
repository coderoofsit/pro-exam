import { apiRequest } from '../../http/api';

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

/** GET /api/v1/topics?chapterSlug=… — non-blocking; used on own-test manual chapter page. */
export async function fetchTopicsByChapterSlug(
	chapterSlug: string,
	fetchFn?: typeof fetch,
	opts?: { signal?: AbortSignal }
): Promise<{ success: boolean; data?: TopicRow[]; message?: string }> {
	const res = await apiRequest<TopicsApiBody>({
		endpoint: `/api/v1/topics?chapterSlug=${encodeURIComponent(chapterSlug)}`,
		method: 'GET',
		fetch: fetchFn,
		signal: opts?.signal
	});
	if (!res.success) {
		return { success: false, message: res.message };
	}
	const body = res.data as TopicsApiBody;
	const list = body?.data;
	return {
		success: true,
		data: Array.isArray(list) ? list : []
	};
}
