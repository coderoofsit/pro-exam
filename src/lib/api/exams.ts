import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type ExamApiItem = {
  _id: string;
  slug?: string;
  boardSlug?: string;
  boardId?: string;
  board?: { _id?: string };
  name: {
    en: string;
    hi?: string;
  };
  image?: string | null;
};

/** Exam as used across the app (lists, store, by-slug fetch). */
export type Exam = {
  _id: string;
  slug: string;
  boardSlug: string;
  boardId?: string;
  board?: { _id?: string };
  name: {
    en: string;
    hi?: string;
  };
  description?: string;
  image?: string | null;
};

export type ExamsResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: ExamApiItem[];
};

export async function fetchExamBySlug(
	slug: string,
	token?: string | null,
	fetchFn?: typeof fetch
): Promise<Exam> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Exam }>({
		endpoint: `/api/v1/exams/by-slug/${encodeURIComponent(slug)}`,
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
		fetch: fetchFn,
		token: t
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch exam');
	return response.data.data;
}

export type ExamsPageResponse = {
	data: Exam[];
	total: number;
	currentPage: number;
	lastPage: number;
	limit: number;
};

export async function fetchExamsPage(
	page: number,
	limit: number = 8,
	token?: string | null,
	fetchFn?: typeof fetch
): Promise<ExamsPageResponse> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: ExamsPageResponse;
	}>({
		endpoint: `/api/v1/exams?page=${page}&limit=${limit}`,
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
		token: t,
		fetch: fetchFn
	});
	if (!response.success) throw new Error(response.message || 'Unable to fetch exams');
	return response.data.data;

}

function mapExam(item: ExamApiItem): Exam {
  return {
    _id: item._id,
    slug: item.slug ?? '',
    boardSlug: item.boardSlug ?? '',
    boardId: item.boardId ?? item.board?._id,
    board: item.board,
    name: {
      en: item.name?.en ?? 'Unnamed Exam',
      hi: item.name?.hi
    },
    description: item.name?.hi ?? '',
    image: item.image ?? null
  };
}

export async function getExamsServer(fetchFn: typeof fetch) {
	const response = await apiRequest<ExamsResponse>({
		endpoint: '/api/v1/exams/all',
		method: 'GET',
		skipAuth: true,
		fetch: fetchFn
	});

	if (!response.success) {
		throw new Error(response.message || 'Failed to fetch exams');
	}

	const payload = response.data;
	if (!payload?.success) {
		throw new Error(payload?.message || 'Failed to fetch exams');
	}

	return {
		exams: (payload.data ?? []).map(mapExam),
		message: payload.message
	};
}

/** SSR-safe: never throws — avoids 500 on profile/create when the API is unreachable. */
export async function getExamsServerSafe(fetchFn: typeof fetch): Promise<{
	exams: Exam[];
	message: string | null;
	examsLoadError: string | null;
}> {
	try {
		const { exams, message } = await getExamsServer(fetchFn);
		return { exams, message: message ?? null, examsLoadError: null };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load exams';
		return { exams: [], message: null, examsLoadError: msg };
	}
}

export async function getExamsClient() {
	const response = await apiRequest<ExamsResponse>({
		endpoint: '/api/v1/exams/all',
		method: 'GET',
		skipAuth: true
	});

	if (!response.success) {
		return {
			success: false as const,
			message: response.message || 'Failed to fetch exams',
			exams: [] as Exam[]
		};
	}

	const payload = response.data;
	if (!payload?.success) {
		return {
			success: false as const,
			message: payload?.message || 'Failed to fetch exams',
			exams: [] as Exam[]
		};
	}

	return {
		success: true as const,
		message: payload.message || 'Exams fetched successfully',
		exams: (payload.data ?? []).map(mapExam)
	};
}

export type ExamName = {
  en: string;
  hi: string;
};

export type ExamForPaperItem = {
  _id: string;
  name: { en: string; hi?: string };
  slug: string;
  image: string | null;
};

export type GetExamsForPapersResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: ExamForPaperItem[];
};

export async function getExamsForPapers(fetchFn?: typeof fetch) {
  return apiRequest<GetExamsForPapersResponse>({
    endpoint: '/api/v1/papers/get-exams-for-papers',
    method: 'GET',
    fetch: fetchFn
  });
}