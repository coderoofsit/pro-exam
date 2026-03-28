import { apiRequest } from '../../http/api';

/** Session payload after creating an attempt from a batch test (client-only). */
export const BATCH_TEST_ATTEMPT_STORAGE_KEY = 'examflow-batch-test-attempt';

export type TestAttemptOption = {
	identifier: string;
	content: string;
	images: unknown[];
};

export type TestAttemptPromptEn = {
	content: string;
	options: TestAttemptOption[];
	images: unknown[];
};

export type TestAttemptQuestion = {
	/** Backend question document id (preferred for PATCH URL). */
	_id?: string;
	id?: string;
	questionId?: string;
	question_id?: string;
	prompt: {
		en: TestAttemptPromptEn;
	};
};

function pickIdString(v: unknown): string | undefined {
	if (v == null) return undefined;
	if (typeof v === 'string' && v.trim()) return v.trim();
	if (typeof v === 'number' && Number.isFinite(v)) return String(v);
	if (typeof v === 'object' && v !== null && '$oid' in v) {
		const oid = (v as { $oid?: unknown }).$oid;
		if (typeof oid === 'string' && oid.trim()) return oid.trim();
	}
	return undefined;
}

/**
 * API may nest the real payload under one or more `data` keys, or use snake_case.
 * Peel until we reach an object that has `questions` and/or attempt id fields.
 */
export function peelTestAttemptEnvelope(root: unknown): unknown {
	let cur: unknown = root;
	for (let i = 0; i < 8; i++) {
		if (!cur || typeof cur !== 'object') return cur;
		const o = cur as Record<string, unknown>;
		const hasQuestions = Array.isArray(o.questions);
		const hasAttempt =
			typeof o.attemptId === 'string' ||
			typeof o.attempt_id === 'string' ||
			(typeof o.id === 'string' && o.id.trim().length >= 8);
		if (hasQuestions || hasAttempt) return cur;
		if (o.data != null && typeof o.data === 'object') {
			cur = o.data;
			continue;
		}
		return cur;
	}
	return cur;
}

/** Breadth-first search for attempt id when envelope shape differs (avoids relying on a single nesting level). */
export function findAttemptIdInApiResponse(root: unknown): string | undefined {
	const queue: unknown[] = [root];
	const seen = new Set<unknown>();
	for (let i = 0; i < 64 && queue.length; i++) {
		const cur = queue.shift();
		if (cur == null || typeof cur !== 'object') continue;
		if (seen.has(cur)) continue;
		seen.add(cur);
		const o = cur as Record<string, unknown>;
		for (const k of ['attemptId', 'attempt_id'] as const) {
			const v = o[k];
			if (typeof v === 'string' && v.trim().length >= 8) return v.trim();
		}
		for (const v of Object.values(o)) {
			if (v != null && typeof v === 'object') queue.push(v);
		}
	}
	return undefined;
}

/** Resolves a string id from various API shapes (Mongo string, `$oid`, `questionId`, nested `question`, etc.). */
export function extractQuestionId(q: unknown, depth = 0): string | undefined {
	if (q == null || typeof q !== 'object' || depth > 4) return undefined;
	const o = q as Record<string, unknown>;
	const nested =
		o.question != null && typeof o.question === 'object'
			? extractQuestionId(o.question, depth + 1)
			: undefined;
	return (
		pickIdString(o._id) ??
		pickIdString(o.id) ??
		pickIdString(o.questionId) ??
		pickIdString(o.question_id) ??
		nested
	);
}

/** One id per question (same order as `questions`) for session storage when PATCH needs stable ids. */
export function collectQuestionIdsFromAttemptQuestions(questions: unknown[]): string[] {
	return questions.map((q) => extractQuestionId(q) ?? '');
}

export type UpdateTestAttemptQuestionBody = {
	timeSpentMs: number;
	answer: string[] | null;
};

/** Optional last question update applied when submitting the whole attempt (backend `submit`). */
export type SubmitTestAttemptBody = {
	questionId?: string;
	timeSpentMs?: number;
	answer?: string[] | null;
};

export type CreateTestAttemptResponseBody = {
	success: boolean;
	statusCode: number;
	message: string;
	data: {
		attemptId: string;
		durationMinutes: number;
		questionCount: number;
		startedAt: string;
		expiresAt: string;
		questions: TestAttemptQuestion[];
	};
};

export type BatchTestAttemptSession = {
	testId: string;
	batchId: string;
	questions: TestAttemptQuestion[];
	/** Parallel to `questions` — Mongo ids for PATCH /questions/:questionId when items omit _id. */
	questionIds?: string[];
	fetchedAt: number;
	/** Optional — set when starting from batch so the attempt UI can show title & timer. */
	testName?: string;
	/** From API — preferred for display and fallbacks. */
	durationMinutes?: number;
	questionCount?: number;
	attemptId?: string;
	startedAt?: string;
	/** ISO string from API — authoritative end time for the timer. */
	expiresAt?: string;
	/** Legacy client-only end (ms); used only when `expiresAt` is missing. */
	timerEndsAt?: number;
	/** Question index → selected option identifier. */
	answers?: Record<string, string>;
	markedIndices?: number[];
	currentQuestionIndex?: number;
};

export async function createTestAttempt(
	body: { testId: string; batchId?: string | null },
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	const payload: { testId: string; batchId?: string } = { testId: body.testId };
	const b = body.batchId != null ? String(body.batchId).trim() : '';
	if (b) payload.batchId = b;
	return apiRequest<CreateTestAttemptResponseBody>({
		endpoint: '/api/v1/test-attempts',
		method: 'POST',
		data: payload,
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}

export async function updateTestAttemptQuestion(
	attemptId: string,
	questionId: string,
	body: UpdateTestAttemptQuestionBody,
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	const path = `/api/v1/test-attempts/${encodeURIComponent(attemptId)}/questions/${encodeURIComponent(questionId)}`;
	const res = await apiRequest<unknown>({
		endpoint: path,
		method: 'PATCH',
		data: body,
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
	if (!res.success && (res.status === 405 || res.status === 501)) {
		return apiRequest<unknown>({
			endpoint: path,
			method: 'PUT',
			data: body,
			fetch: fetchFn,
			...(options?.token ? { token: options.token } : {})
		});
	}
	return res;
}

export async function submitTestAttempt(
	attemptId: string,
	body?: SubmitTestAttemptBody,
	fetchFn?: typeof fetch,
	options?: { token?: string }
) {
	return apiRequest<unknown>({
		endpoint: `/api/v1/test-attempts/${encodeURIComponent(attemptId)}/submit`,
		method: 'POST',
		data: body ?? {},
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
}

/** GET /api/v1/test-attempts/:testAttemptId — summary + statsBreakdown (no per-question array). */
export type TestAttemptBreakdownRow = {
	totalQuestions: number;
	attemptedCount: number;
	correctCount: number;
	incorrectCount: number;
	unattemptedCount: number;
	totalMarks: number;
	obtainedMarks: number;
	accuracy: number;
	timeSpentMs: number;
};

export type LocalizedName = { en?: string; hi?: string };

export type TestAttemptSummary = {
	_id: string;
	status: string;
	startedAt?: string;
	expiresAt?: string;
	endedAt?: string | null;
	submittedAt?: string | null;
	totalMarks: number;
	obtainedMarks: number;
	correctCount: number;
	incorrectCount: number;
	unattemptedCount: number;
	accuracy: number;
	percentile: number | null;
	rank: number | null;
	totalTimeSpentMs: number;
	statsBreakdown: {
		bySubject: Array<
			TestAttemptBreakdownRow & {
				subjectId?: { _id?: string; name?: LocalizedName };
			}
		>;
		byKind: Array<TestAttemptBreakdownRow & { kind: string }>;
		byChapterGroup: Array<
			TestAttemptBreakdownRow & {
				chapterGroupId?: { _id?: string; name?: LocalizedName };
			}
		>;
		byChapter: Array<
			TestAttemptBreakdownRow & {
				chapterId?: { _id?: string; name?: LocalizedName };
			}
		>;
	};
};

type TestAttemptByIdApiBody = {
	success?: boolean;
	statusCode?: number;
	message?: string;
	data?: TestAttemptSummary;
};

export async function fetchTestAttemptById(
	attemptId: string,
	fetchFn?: typeof fetch,
	options?: { token?: string }
): Promise<
	| { success: true; data: TestAttemptSummary }
	| { success: false; message: string; status?: number }
> {
	const trimmed = attemptId.trim();
	if (!trimmed) {
		return { success: false, message: 'Attempt id is required.' };
	}
	const res = await apiRequest<TestAttemptByIdApiBody>({
		endpoint: `/api/v1/test-attempts/${encodeURIComponent(trimmed)}`,
		method: 'GET',
		fetch: fetchFn,
		...(options?.token ? { token: options.token } : {})
	});
	if (!res.success) {
		return { success: false, message: res.message, status: res.status };
	}
	const body = res.data;
	const inner = body && typeof body === 'object' ? (body as TestAttemptByIdApiBody).data : undefined;
	if (!inner || typeof inner !== 'object') {
		return {
			success: false,
			message:
				(body && typeof body === 'object' && 'message' in body && typeof (body as { message?: string }).message === 'string'
					? (body as { message: string }).message
					: undefined) ?? 'Could not load test attempt.',
			status: res.status
		};
	}
	return { success: true, data: inner };
}
