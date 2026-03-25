import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type Chapter = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug?: string;
};

export type ChapterGroup = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug?: string;
	subjectId?: string;
	subjectSlug?: string;
};

export type SubjectWithGroups = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug: string;
	boardSlug?: string;
	examSlug?: string;
	chapterGroups: ChapterGroup[];
};

export type ChaptersHierarchyResponse = {
	subjects: SubjectWithGroups[];
};

export type ChaptersPageResponse = {
	data: Chapter[];
	total: number;
	currentPage: number;
	lastPage: number;
	limit: number;
};

export async function fetchChapterBySlug(slug: string, token?: string | null): Promise<Chapter> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Chapter }>({
		endpoint: `/api/v1/chapters?slug=${encodeURIComponent(slug)}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapter');
	return response.data.data;
}

export async function fetchChapterById(id: string, token?: string | null): Promise<Chapter> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Chapter }>({
		endpoint: `/api/v1/chapters/${encodeURIComponent(id)}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapter');
	return response.data.data;
}

/** @deprecated Use fetchChaptersHierarchy for hierarchy. Returns flat list only when backend supports fallback. */
export async function fetchChaptersByBoardAndExam(
	boardSlug: string,
	examSlug: string,
	token?: string | null
): Promise<Chapter[]> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Chapter[] }>({
		endpoint: `/api/v1/chapters?boardSlug=${boardSlug}&examSlug=${examSlug}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapters');
	const data = response.data.data;
	if (!Array.isArray(data)) return [];
	return [...data].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.name.en.localeCompare(b.name.en);
	});
}

export async function fetchChaptersHierarchy(
	boardSlug: string,
	examSlug: string,
	token?: string | null
): Promise<ChaptersHierarchyResponse> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: ChaptersHierarchyResponse;
	}>({
		endpoint: `/api/v1/chapters?boardSlug=${encodeURIComponent(boardSlug)}&examSlug=${encodeURIComponent(examSlug)}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch hierarchy');
	return response.data.data;
}

/** Returns all chapters when no page/limit. Returns paginated object when page/limit provided. */
export async function fetchChaptersByChapterGroupId(
	chapterGroupId: string,
	token?: string | null,
	options?: { page?: number; limit?: number }
): Promise<Chapter[] | ChaptersPageResponse> {
	const t = resolveApiToken(token);
	const { page, limit } = options ?? {};
	const params = new URLSearchParams({ chapterGroupId });
	if (page != null) params.set('page', String(Math.max(1, page)));
	if (limit != null) params.set('limit', String(Math.min(100, Math.max(1, limit))));
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: Chapter[] | ChaptersPageResponse;
	}>({
		endpoint: `/api/v1/chapters?${params.toString()}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapters');
	const payload = response.data.data;
	if (Array.isArray(payload)) return payload;
	return payload as ChaptersPageResponse;
}

export type LocalizedName = { en: string; hi?: string };

/** Single chapter row under a unit (chapter group). */
export type GroupedChapterItem = {
	_id: string;
	slug: string;
	name: LocalizedName;
};

/** One unit (chapter group) with nested chapters. */
export type GroupedChapterGroupRow = {
	chapterGroup: {
		_id: string;
		slug: string;
		name: LocalizedName;
	};
	data: GroupedChapterItem[];
};

/** One subject with its units. */
export type GroupedSubjectRow = {
	subject: {
		_id: string;
		slug: string;
		name: LocalizedName;
	};
	data: GroupedChapterGroupRow[];
};

export type GroupedChaptersByExamApiBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: GroupedSubjectRow[];
};

/** Grouped chapters for `/api/v1/chapters?examSlug=…` (subjects → units → chapters). */
export async function fetchGroupedChaptersByExamSlug(examSlug: string, fetchFn?: typeof fetch) {
	console.log("exam slug apiu call")
	return apiRequest<GroupedChaptersByExamApiBody>({
		endpoint: `/api/v1/chapters?examSlug=${encodeURIComponent(examSlug)}`,
		method: 'GET',
		fetch: fetchFn
	});
}

export async function fetchChaptersPage(
	boardSlug: string,
	examSlug: string,
	page: number = 1,
	limit: number = 8,
	token?: string | null
): Promise<ChaptersPageResponse> {
	const t = resolveApiToken(token);
	const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
	const safeLimit = Math.min(100, Math.max(1, limit));
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: ChaptersPageResponse;
	}>({
		endpoint: `/api/v1/chapters?boardSlug=${encodeURIComponent(boardSlug)}&examSlug=${encodeURIComponent(examSlug)}&page=${safePage}&limit=${safeLimit}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch chapters');
	return response.data.data;
}
