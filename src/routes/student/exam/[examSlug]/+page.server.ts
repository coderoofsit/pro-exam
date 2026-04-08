import type { PageServerLoad } from './$types';
import { fetchExamBySlug } from '$lib/api/exams';
import { fetchChaptersByChapterGroupId, fetchChaptersHierarchy } from '$lib/api/chapters';
import type { Chapter, GroupedChapterItem, GroupedSubjectRow } from '$lib/api/chapters';
import { getAuthTokenFromCookies } from '$lib/auth/cookieToken';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
	const examSlug = params.examSlug;
	const token = getAuthTokenFromCookies(cookies) ?? null;

	try {
		const exam = await fetchExamBySlug(examSlug, token, fetch);
		const boardSlug = (exam as any).boardSlug;

		if (!boardSlug || typeof boardSlug !== 'string') {
			return {
				examSlug,
				groupedSubjects: [] as GroupedSubjectRow[],
				message: 'Board slug not found for this exam'
			};
		}

		// subjects -> chapterGroups
		const hierarchy = await fetchChaptersHierarchy(boardSlug, examSlug);
		const subjects = hierarchy.subjects ?? [];

		// chapterGroupId -> chapters
		const chapterGroups = subjects.flatMap((s) => s.chapterGroups ?? []);
		const chaptersByChapterGroupId: Record<string, GroupedChapterItem[]> = {};

		await Promise.all(
			chapterGroups.map(async (cg) => {
				if (!cg?._id) return;
				const res = await fetchChaptersByChapterGroupId(cg._id);
				const chapters = Array.isArray(res) ? res : res.data;
				chaptersByChapterGroupId[cg._id] = (chapters ?? []).map(
					(ch: Chapter): GroupedChapterItem => ({
						_id: ch._id,
						slug: ch.slug ?? '',
						name: ch.name
					})
				);
			})
		);

		const examId = exam._id;
		const boardId =
			typeof (exam as { boardId?: string }).boardId === 'string'
				? (exam as { boardId: string }).boardId
				: typeof (exam as { board?: unknown }).board === 'object' &&
					  (exam as { board?: { _id?: string } }).board?._id
					? (exam as { board: { _id: string } }).board._id
					: '';

		const groupedSubjects: GroupedSubjectRow[] = subjects.map((s) => ({
			examId,
			boardId,
			subject: {
				_id: s._id,
				slug: s.slug,
				name: s.name
			},
			data: (s.chapterGroups ?? []).map((cg) => ({
				chapterGroup: {
					_id: cg._id,
					slug: cg.slug ?? '',
					name: cg.name
				},
				data: chaptersByChapterGroupId[cg._id] ?? []
			}))
		}));

		return {
			examSlug,
			groupedSubjects,
			message: null as string | null
		};
	} catch (e) {
		return {
			examSlug,
			groupedSubjects: [] as GroupedSubjectRow[],
			message: e instanceof Error ? e.message : 'Failed to load custom data'
		};
	}
};

