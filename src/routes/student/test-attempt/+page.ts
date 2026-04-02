import { browser } from '$app/environment';
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
} from '$lib/student/testAttempt/normalize';
import type { PageLoad } from './$types';

export const ssr = false;

export type { NormalizedQuestion, NormalizedSection };

function parseSectionMeta(parsed: BatchTestAttemptSession): TestAttemptSectionMeta[] | undefined {
	const raw = parsed.sections;
	if (!Array.isArray(raw) || raw.length === 0) return undefined;
	return raw.filter((s) => s != null && typeof s === 'object') as TestAttemptSectionMeta[];
}

export const load: PageLoad = ({ url }) => {
	if (!browser) {
		return {
			questions: [] as NormalizedQuestion[],
			sections: [] as NormalizedSection[],
			testName: 'Test',
			durationMinutes: 60,
			questionCount: 0,
			attemptId: null,
			expiresAt: null,
			startedAt: null,
			testId: '',
			batchId: ''
		};
	}

	const testId = url.searchParams.get('testId') ?? '';
	const batchId = url.searchParams.get('batchId') ?? '';

	if (!testId) {
		return {
			questions: [],
			sections: [],
			testName: 'Test',
			durationMinutes: 60,
			questionCount: 0,
			attemptId: null,
			expiresAt: null,
			startedAt: null,
			testId: '',
			batchId: '',
			loadError: 'Missing test. Start the test from your tests or batch page.'
		};
	}

	try {
		const stored = sessionStorage.getItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
		if (!stored) {
			return {
				questions: [],
				sections: [],
				testName: 'Test',
				durationMinutes: 60,
				questionCount: 0,
				attemptId: null,
				expiresAt: null,
				startedAt: null,
				testId: '',
				batchId: '',
				loadError: 'No test data found. Start the test from your batch page.'
			};
		}

		const parsed = JSON.parse(stored) as BatchTestAttemptSession;
		const sessionBatch = (parsed.batchId ?? '').trim();
		const urlBatch = batchId.trim();
		if (parsed.testId !== testId || sessionBatch !== urlBatch) {
			return {
				questions: [],
				sections: [],
				testName: 'Test',
				durationMinutes: 60,
				testId: '',
				batchId: '',
				loadError: 'Test data does not match this link. Start the test again from your tests or batch.'
			};
		}

		const questionList = Array.isArray(parsed.questions) ? parsed.questions : [];
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
			startedAt: parsed.startedAt ?? null,
			testId,
			batchId
		};
	} catch {
		return {
			questions: [],
			sections: [],
			testName: 'Test',
			durationMinutes: 60,
			questionCount: 0,
			attemptId: null,
			expiresAt: null,
			startedAt: null,
			testId: '',
			batchId: '',
			loadError: 'Could not read test data.'
		};
	}
};
