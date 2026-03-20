// import { BASE_URL, TOKEN } from '$lib/http';

// export type Exam = {
// 	_id: string;
// 	name: { en: string; hi?: string };
// 	slug: string;
// 	image: string | null;
// 	order: number;
// 	isActive: boolean;
// 	boardSlug: string;
// 	numberofPapers: number;
// 	numberofQuestions: number;
// 	numberofTests: number;
// };

// export type ExamResponse = {
// 	success: boolean;
// 	statusCode: number;
// 	message: string;
// 	data: Exam;
// };

// export async function fetchExamsByBoard(boardId: string, fetchFn: typeof fetch = fetch): Promise<Exam[]> {
// 	const res = await fetchFn(`${BASE_URL}/api/v1/exams?boardId=${boardId}`, {
// 		method: 'GET',
// 		headers: {
// 			Authorization: TOKEN,
// 			'Content-Type': 'application/json'
// 		}
// 	});

// 	if (!res.ok) throw new Error('Failed to fetch exams');

// 	const result: { success: boolean; message: string; data: Exam[] } = await res.json();
// 	if (!result.success) throw new Error(result.message || 'Unable to fetch exams');

// 	return result.data.sort((a, b) => a.order - b.order);
// }


import { BASE_URL } from '$lib/http';

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