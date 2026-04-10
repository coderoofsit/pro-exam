import { apiRequest } from '../../http/api';
import { resolveApiToken } from './authToken';

export type ReportReason =
	| 'WRONG_QUESTION'
	| 'WRONG_ANSWER'
	| 'WRONG_SOLUTION'
	| 'TYPO'
	| 'BAD_LATEX'
	| 'MISSING_IMAGE'
	| 'WRONG_OPTIONS'
	| 'DUPLICATE'
	| 'OTHER';

export interface CreateReportDto {
	questionId: string;
	reason: ReportReason;
	message?: string;
}

export async function createReport(
	data: CreateReportDto,
	token?: string | null
) {
	const t = resolveApiToken(token);

	const response = await apiRequest<{
		success: boolean;
		message: string;
		data: any;
	}>({
		endpoint: '/api/v1/report',
		method: 'POST',
		data,
		headers: { 'Content-Type': 'application/json' },
		token: t
	});

	if (!response.success) {
		throw new Error(response.message || 'Unable to submit report');
	}

	return response.data;
}
