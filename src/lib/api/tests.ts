import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';
import type { OwnTestDistributionContinueData } from '$lib/ownTest/questionDistribution';

export type CreateRandomCustomTestBody = {
	boardId: string;
	examId: string;
	name: { en: string };
	kind: string;
	settings: {
		durationMinutes: null;
		startDate: null;
		startTime: null;
		endDate: null;
		endTime: null;
	};
	subjects: OwnTestDistributionContinueData['subjects'];
};

export async function createRandomCustomTest(
	body: CreateRandomCustomTestBody,
	token?: string | null
) {
	const t = resolveApiToken(token);
	return apiRequest<unknown>({
		endpoint: '/api/v1/tests/create-random-test',
		method: 'POST',
		data: body,
		token: t
	});
}

export type CreateManualCustomTestBody = {
	boardId: string;
	examId: string;
	name: { en: string };
	kind: string;
	settings: {
		durationMinutes: null;
		startDate: null;
		startTime: null;
		endDate: null;
		endTime: null;
	};
	questions: Array<{ questionId: string; order?: number }>;
};

export async function createManualCustomTest(body: CreateManualCustomTestBody, token?: string | null) {
	const t = resolveApiToken(token);
	return apiRequest<unknown>({
		endpoint: '/api/v1/tests',
		method: 'POST',
		data: body,
		token: t
	});
}
