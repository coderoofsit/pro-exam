import type { PageServerLoad } from './$types';
import type { GroupedSubjectRow } from '$lib/api/chapters';

type SubjectNavRow = {
	_id: string;
	slug: string;
	name?: { en: string; hi?: string };
	unitCount: number;
};

type ChapterLite = { _id: string; slug?: string; order?: number; name?: { en: string; hi?: string } };
export type ChapterCardRow = { chapter: ChapterLite; groupName: string; groupOrder: number };

export type ChapterGroupMeta = {
	_id: string;
	name: { en: string; hi?: string };
	order: number;
	slug?: string;
};

/**
 * Shell-only: grouped chapters load on the client for fast first paint and direct API RTT.
 */
export const load: PageServerLoad = async ({ params, parent }) => {
	await parent();
	const examSlug = params.examSlug;

	return {
		examSlug,
		exam: null,
		hierarchy: null,
		subjects: [] as SubjectNavRow[],
		chaptersBySubjectSlug: {} as Record<string, ChapterCardRow[]>,
		chapterGroupsBySubjectSlug: {} as Record<string, ChapterGroupMeta[]>,
		fullChaptersFromGrouped: true,
		initialSubjectSlug: '',
		message: null as string | null,
		_rawGrouped: [] as GroupedSubjectRow[],
	};
};
