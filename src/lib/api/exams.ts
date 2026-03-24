import { BASE_URL } from '$lib/http';
import { apiRequest } from '../../http/api';

export type ExamApiItem = {
  _id: string;
  name: {
    en: string;
    hi?: string;
  };
  image?: string | null;
};

export type Exam = {
  _id: string;
  name: string;
  description?: string;
  image?: string | null;
};

export type ExamsResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: ExamApiItem[];
};

function mapExam(item: ExamApiItem): Exam {
  return {
    _id: item._id,
    name: item.name?.en ?? 'Unnamed Exam',
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