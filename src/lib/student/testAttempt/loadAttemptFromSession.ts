import {
	BATCH_TEST_ATTEMPT_STORAGE_KEY,
	type BatchTestAttemptSession
} from '$lib/api/testAttempts';
import {
	buildNormalizedSections,
	mergeQuestionIdsIntoNormalized,
	normalizeQuestionsForTestUi,
	type NormalizedQuestion,
	type NormalizedSection,
	type TestAttemptSectionMeta
} from './normalize';

export type AttemptPagePayload = {
	questions: NormalizedQuestion[];
	sections: NormalizedSection[];
	testName: string;
	durationMinutes: number;
	questionCount: number;
	attemptId: string | null;
	expiresAt: string | null;
	startedAt: string | null;
};

/** Set by tests page when createTestAttempt fails after navigating away. */
export const ATTEMPT_START_ERROR_KEY = 'Exam Abhyas-attempt-start-error';

function parseSectionMeta(parsed: BatchTestAttemptSession): TestAttemptSectionMeta[] | undefined {
	const raw = parsed.sections;
	if (!Array.isArray(raw) || raw.length === 0) return undefined;
	return raw.filter((s) => s != null && typeof s === 'object') as TestAttemptSectionMeta[];
}

/**
 * Reads and normalizes the batch attempt session for the given test/batch ids.
 * Returns `null` if nothing in storage, ids mismatch, or parse error.
 */
export function loadAttemptDataFromSession(testId: string, batchId: string): AttemptPagePayload | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const stored = sessionStorage.getItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
		if (!stored) return null;

		const parsed = JSON.parse(stored) as BatchTestAttemptSession;
		const sessionBatch = (parsed.batchId ?? '').trim();
		const urlBatch = batchId.trim();
		if (parsed.testId !== testId || sessionBatch !== urlBatch) return null;

		const questionList = Array.isArray(parsed.questions) ? parsed.questions : [];
		if (questionList.length === 0) return null;

		const sectionMeta = parseSectionMeta(parsed);

		const qc =
			typeof parsed.questionCount === 'number'
				? parsed.questionCount
				: questionList.length;
		const dm =
			typeof parsed.durationMinutes === 'number' && parsed.durationMinutes > 0
				? parsed.durationMinutes
				: 60;

		const flat = mergeQuestionIdsIntoNormalized(
			normalizeQuestionsForTestUi(questionList),
			parsed.questionIds
		);
		const sections = buildNormalizedSections(flat, sectionMeta);

		return {
			questions: flat,
			sections,
			testName: parsed.testName ?? 'Test',
			durationMinutes: dm,
			questionCount: qc,
			attemptId: parsed.attemptId ?? null,
			expiresAt: parsed.expiresAt ?? null,
			startedAt: parsed.startedAt ?? null
		};
	} catch {
		return null;
	}
}

export function readAttemptStartError(): string | null {
	if (typeof sessionStorage === 'undefined') return null;
	try {
		const m = sessionStorage.getItem(ATTEMPT_START_ERROR_KEY);
		return m?.trim() ? m : null;
	} catch {
		return null;
	}
}

export function clearAttemptStartError(): void {
	try {
		sessionStorage.removeItem(ATTEMPT_START_ERROR_KEY);
	} catch {
		// ignore
	}
}
