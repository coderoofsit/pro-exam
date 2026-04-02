import { extractQuestionId, type TestAttemptQuestion } from '$lib/api/testAttempts';

export type NormalizedQuestion = {
	_id?: string;
	id?: string;
	questionId?: string;
	sectionSlug?: string;
	order?: number;
	prompt: {
		en: {
			content: string;
			options: {
				identifier: string;
				content: string;
				images: string[];
			}[];
			images: string[];
		};
	};
};

export type NormalizedSection = {
	slug: string;
	title: string;
	questionStartIndex: number;
	questionEndIndex: number;
	questions: NormalizedQuestion[];
};

export type TestAttemptSectionMeta = {
	title?: string;
	slug?: string;
	order?: number;
	numberOfQuestions?: number;
};

function normalizeImageUrls(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	for (const x of raw) {
		if (typeof x === 'string' && x.trim()) {
			out.push(x.trim());
			continue;
		}
		if (x != null && typeof x === 'object' && 'url' in x) {
			const u = (x as { url?: unknown }).url;
			if (typeof u === 'string' && u.trim()) out.push(u.trim());
		}
	}
	return out;
}

function pickSectionSlug(q: TestAttemptQuestion): string | undefined {
	const o = q as Record<string, unknown>;
	const s = o.sectionSlug ?? o.section_slug;
	if (typeof s === 'string' && s.trim()) return s.trim();
	return undefined;
}

export function normalizeQuestionsForTestUi(raw: TestAttemptQuestion[]): NormalizedQuestion[] {
	return raw.map((item, orderIdx) => {
		const id = extractQuestionId(item);
		const en = item.prompt.en;
		const sectionSlug = pickSectionSlug(item);
		return {
			...item,
			_id: id ?? item._id,
			id: item.id,
			questionId: item.questionId,
			sectionSlug,
			order: orderIdx,
			prompt: {
				en: {
					content: en.content,
					options: en.options.map((o) => ({
						identifier: o.identifier,
						content: o.content,
						images: normalizeImageUrls(o.images)
					})),
					images: normalizeImageUrls(en.images)
				}
			}
		};
	});
}

export function mergeQuestionIdsIntoNormalized(
	normalized: NormalizedQuestion[],
	questionIds: string[] | undefined
): NormalizedQuestion[] {
	if (!questionIds?.length) return normalized;
	return normalized.map((q, i) => {
		const id = questionIds[i]?.trim();
		if (!id) return q;
		return {
			...q,
			_id: q._id ?? id,
			questionId: id,
			id: q.id ?? id
		};
	});
}

/**
 * Groups flat questions into sections using API `sections` metadata + per-question `sectionSlug`.
 * When `sectionMeta` is missing/empty, returns a single section covering all questions.
 */
export function buildNormalizedSections(
	flat: NormalizedQuestion[],
	sectionMeta: TestAttemptSectionMeta[] | undefined | null
): NormalizedSection[] {
	if (flat.length === 0) return [];

	if (!sectionMeta?.length) {
		return [
			{
				slug: '_all',
				title: 'Questions',
				questionStartIndex: 0,
				questionEndIndex: flat.length - 1,
				questions: flat
			}
		];
	}

	const sortedMeta = [...sectionMeta].sort(
		(a, b) => (a.order ?? 0) - (b.order ?? 0)
	);

	const bySlug = new Map<string, number[]>();
	for (let i = 0; i < flat.length; i++) {
		const slug = flat[i].sectionSlug?.trim() || '_default';
		if (!bySlug.has(slug)) bySlug.set(slug, []);
		bySlug.get(slug)!.push(i);
	}

	const out: NormalizedSection[] = [];
	const used = new Set<string>();

	for (const sm of sortedMeta) {
		const slug = (sm.slug ?? '').trim() || '_default';
		const idxs = bySlug.get(slug);
		if (!idxs?.length) continue;
		used.add(slug);
		out.push({
			slug,
			title: (sm.title ?? slug).trim() || slug,
			questionStartIndex: idxs[0],
			questionEndIndex: idxs[idxs.length - 1],
			questions: idxs.map((i) => flat[i])
		});
	}

	for (const [slug, idxs] of bySlug) {
		if (used.has(slug) || !idxs.length) continue;
		out.push({
			slug,
			title: slug,
			questionStartIndex: idxs[0],
			questionEndIndex: idxs[idxs.length - 1],
			questions: idxs.map((i) => flat[i])
		});
	}

	return out.length > 0
		? out
		: [
				{
					slug: '_all',
					title: 'Questions',
					questionStartIndex: 0,
					questionEndIndex: flat.length - 1,
					questions: flat
				}
			];
}
