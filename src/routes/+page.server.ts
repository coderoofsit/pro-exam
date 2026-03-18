// import { BASE_URL } from '$lib/http';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
type Chapter = {
	_id: string;
	name: {
		en: string;
		hi?: string;
	};
	order: number;
};

type ChaptersApiResponse = {
	success: boolean;
	statusCode: number;
	message: string;
	data: Chapter[];
};
export const BASE_URL = "https://test-exam-backend-5yh6.onrender.com";
const API_URL =
	`${BASE_URL}/api/v1/chapters?boardSlug=jee&examSlug=jee-mains`;

const TOKEN =
	'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YTAyMjAzNmY0OGI2NTM1YzA3MGFiYiIsIm93bmVkQnkiOm51bGwsIm93bmVkUm9sZSI6bnVsbCwicm9sZSI6Imluc3RpdHV0ZSIsImlhdCI6MTc3Mzc1OTY1Mn0.Zb2vZB4ErKGvEAcy8IKmgAiimKeBL455m5TnEWMtyMQ';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch(API_URL, {
		method: 'GET',
		headers: {
			Authorization: TOKEN,
			'Content-Type': 'application/json'
		}
	});

	if (!res.ok) {
		throw error(res.status, 'Failed to fetch chapters');
	}

	const result: ChaptersApiResponse = await res.json();

	if (!result.success) {
		throw error(500, result.message || 'Unable to fetch chapters');
	}

	const chapters = [...result.data].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.name.en.localeCompare(b.name.en);
	});

	return {
		chapters,
		total: chapters.length,
		message: result.message
	};
};