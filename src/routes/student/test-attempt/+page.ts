import { browser } from '$app/environment';
import { BATCH_TEST_ATTEMPT_STORAGE_KEY, type BatchTestAttemptSession } from '$lib/api/testAttempts';
import { loadAttemptDataFromSession } from '$lib/student/testAttempt/loadAttemptFromSession';
import type { NormalizedQuestion, NormalizedSection } from '$lib/student/testAttempt/normalize';
import type { PageLoad } from './$types';

export const ssr = false;

export type { NormalizedQuestion, NormalizedSection };

function prelaunchShell(
	testId: string,
	batchId: string,
	url: URL
): {
	questions: NormalizedQuestion[];
	sections: NormalizedSection[];
	testName: string;
	durationMinutes: number;
	questionCount: number;
	attemptId: null;
	expiresAt: null;
	startedAt: null;
	testId: string;
	batchId: string;
	prelaunch: true;
} {
	const raw = url.searchParams.get('testName');
	const testName = raw ? decodeURIComponent(raw) : 'Test';
	return {
		questions: [],
		sections: [],
		testName,
		durationMinutes: 60,
		questionCount: 0,
		attemptId: null,
		expiresAt: null,
		startedAt: null,
		testId,
		batchId,
		prelaunch: true
	};
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
			batchId: '',
			prelaunch: false
		};
	}

	const testId = url.searchParams.get('testId') ?? '';
	const batchId = url.searchParams.get('batchId') ?? '';
	const prelaunchParam = url.searchParams.get('prelaunch') === '1';

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
			prelaunch: false,
			loadError: 'Missing test. Start the test from your tests or batch page.'
		};
	}

	try {
		const stored = sessionStorage.getItem(BATCH_TEST_ATTEMPT_STORAGE_KEY);
		if (!stored) {
			if (prelaunchParam) {
				return prelaunchShell(testId, batchId, url);
			}
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
				prelaunch: false,
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
				prelaunch: false,
				loadError: 'Test data does not match this link. Start the test again from your tests or batch.'
			};
		}

		const payload = loadAttemptDataFromSession(testId, batchId);
		if (!payload) {
			if (prelaunchParam) {
				return prelaunchShell(testId, batchId, url);
			}
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
				prelaunch: false,
				loadError: 'Could not read test data.'
			};
		}

		return {
			...payload,
			testId,
			batchId,
			prelaunch: false
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
			prelaunch: false,
			loadError: 'Could not read test data.'
		};
	}
};
