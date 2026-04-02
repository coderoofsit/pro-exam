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
	const direct = o.sectionSlug ?? o.section_slug;
	if (typeof direct === 'string' && direct.trim()) return direct.trim();
	const secObj = o.section;
	if (secObj != null && typeof secObj === 'object') {
		const s = (secObj as Record<string, unknown>).slug ?? (secObj as Record<string, unknown>).title;
		if (typeof s === 'string' && s.trim()) return s.trim();
	}
	const nested = o.question;
	if (nested != null && typeof nested === 'object') {
		const n = nested as Record<string, unknown>;
		const ns = n.sectionSlug ?? n.section_slug;
		if (typeof ns === 'string' && ns.trim()) return ns.trim();
		const nSec = n.section;
		if (nSec != null && typeof nSec === 'object') {
			const sl = (nSec as Record<string, unknown>).slug;
			if (typeof sl === 'string' && sl.trim()) return sl.trim();
		}
	}
	return undefined;
}

function slugToSectionTitle(slug: string): string {
	if (slug === '_default') return 'Questions';
	return slug
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' ');
}

/** When API omits `sections` but questions carry `sectionSlug`, group by slug in first-seen order. */
function buildSectionsFromQuestionSlugsOnly(flat: NormalizedQuestion[]): NormalizedSection[] {
	const order: string[] = [];
	const seen = new Set<string>();
	for (const q of flat) {
		const s = q.sectionSlug?.trim() || '_default';
		if (!seen.has(s)) {
			seen.add(s);
			order.push(s);
		}
	}
	if (order.length === 0) return [];

	if (order.length === 1) {
		const only = order[0];
		if (only === '_default') {
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
		return [
			{
				slug: only,
				title: slugToSectionTitle(only),
				questionStartIndex: 0,
				questionEndIndex: flat.length - 1,
				questions: flat
			}
		];
	}

	const bySlug = new Map<string, number[]>();
	for (let i = 0; i < flat.length; i++) {
		const s = flat[i].sectionSlug?.trim() || '_default';
		if (!bySlug.has(s)) bySlug.set(s, []);
		bySlug.get(s)!.push(i);
	}

	const out: NormalizedSection[] = [];
	for (const slug of order) {
		const idxs = bySlug.get(slug);
		if (!idxs?.length) continue;
		out.push({
			slug,
			title: slugToSectionTitle(slug),
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

function findIndicesForMetaSlug(
	metaSlug: string,
	bySlug: Map<string, number[]>
): number[] | undefined {
	const trimmed = metaSlug.trim();
	if (bySlug.has(trimmed)) return bySlug.get(trimmed);
	const lower = trimmed.toLowerCase();
	for (const [k, v] of bySlug) {
		if (k.toLowerCase() === lower) return v;
	}
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
		return buildSectionsFromQuestionSlugsOnly(flat);
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
		const idxs = findIndicesForMetaSlug(slug, bySlug);
		if (!idxs?.length) continue;
		const canonicalKey =
			[...bySlug.keys()].find((k) => k.toLowerCase() === slug.toLowerCase()) ?? slug;
		used.add(canonicalKey);
		out.push({
			slug: canonicalKey,
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
			title: slugToSectionTitle(slug),
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
