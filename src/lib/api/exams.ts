import { BASE_URL, TOKEN } from '$lib/http';

export type Exam = {
	_id: string;
	name: { en: string; hi?: string };
	slug: string;
	image: string | null;
	order: number;
	isActive: boolean;
	boardSlug: string;
	numberofPapers: number;
	numberofQuestions: number;
	numberofTests: number;
};

export type ExamResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: Exam;
};

export async function fetchExamsByBoard(boardId: string, fetchFn: typeof fetch = fetch): Promise<Exam[]> {
	const res = await fetchFn(`${BASE_URL}/api/v1/exams?boardId=${boardId}`, {
		method: 'GET',
		headers: {
			Authorization: TOKEN,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) throw new Error('Failed to fetch exams');

	const result: { success: boolean; message: string; data: Exam[] } = await res.json();
	if (!result.success) throw new Error(result.message || 'Unable to fetch exams');

	return result.data.sort((a, b) => a.order - b.order);
}
