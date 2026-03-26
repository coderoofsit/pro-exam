import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';
import { BASE_URL } from '$lib/http';

export type ExamApiItem = {
  _id: string;
  slug?: string;
  boardSlug?: string;
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

export async function fetchExamBySlug(slug: string, token?: string | null): Promise<Exam> {
	const t = resolveApiToken(token);
	const response = await apiRequest<{ success: boolean; message: string; data: Exam }>({
		endpoint: `/api/v1/exams/by-slug/${slug}`,
		method: 'GET',
		token: t,
		headers: { 'Content-Type': 'application/json' }
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
		token: t,
		headers: { 'Content-Type': 'application/json' },
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
    name: {
      en: item.name?.en ?? 'Unnamed Exam',
      hi: item.name?.hi
    },
    description: item.name?.hi ?? '',
    image: item.image ?? null
  };
}

export async function getExamsServer(fetchFn: typeof fetch) {
  const res = await fetchFn(`${BASE_URL}/api/v1/exams/all`, {
    method: 'GET'
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch exams: ${res.status}`);
  }

  const result: ExamsResponse = await res.json();

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch exams');
  }

  return {
    exams: (result.data ?? []).map(mapExam),
    message: result.message
  };
}

export async function getExamsClient() {
  const res = await fetch(`${BASE_URL}/api/v1/exams/all`, {
    method: 'GET'
  });

  let result: ExamsResponse | null = null;

  try {
    result = await res.json();
  } catch {
    result = null;
  }

  if (!res.ok) {
    return {
      success: false as const,
      message: result?.message || `Failed to fetch exams: ${res.status}`,
      exams: [] as Exam[]
    };
  }

  return {
    success: true as const,
    message: result?.message || 'Exams fetched successfully',
    exams: (result?.data ?? []).map(mapExam)
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