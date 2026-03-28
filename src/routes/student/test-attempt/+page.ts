import { browser } from '$app/environment';
import {
	BATCH_TEST_ATTEMPT_STORAGE_KEY,
	extractQuestionId,
	type BatchTestAttemptSession,
	type TestAttemptQuestion
} from '$lib/api/testAttempts';
import type { PageLoad } from './$types';

/** Questions only exist in sessionStorage after POST from batch; avoid SSR so load runs in the browser. */
export const ssr = false;

/** Maps API payload to the shape expected by `TestAttempt` (e.g. `images` as string[]). */
function normalizeForTestUi(raw: TestAttemptQuestion[]) {
	return raw.map((item) => {
		const id = extractQuestionId(item);
		const en = item.prompt.en;
		return {
			...item,
			_id: id ?? item._id,
			id: item.id,
			prompt: {
				en: {
					content: en.content,
					options: en.options.map((o) => ({
						identifier: o.identifier,
						content: o.content,
						images: Array.isArray(o.images) ? o.images.map(String) : []
					})),
					images: Array.isArray(en.images) ? en.images.map(String) : []
				}
			}
		};
	});
}

export const load: PageLoad = ({ url }) => {
	if (!browser) {
		return {
			questions: [],
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
				testName: 'Test',
				durationMinutes: 60,
				testId: '',
				batchId: '',
				loadError: 'Test data does not match this link. Start the test again from your tests or batch.'
			};
		}

		const questionList = Array.isArray(parsed.questions) ? parsed.questions : [];

		const qc =
			typeof parsed.questionCount === 'number'
				? parsed.questionCount
				: questionList.length;
		const dm =
			typeof parsed.durationMinutes === 'number' && parsed.durationMinutes > 0
				? parsed.durationMinutes
				: 60;

		return {
			questions: normalizeForTestUi(questionList),
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
