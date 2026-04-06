/** Own-test random flow types + question distribution helpers. */

export type OwnTestUnitSelection = {
	unitId: string;
	unitName: string;
	chapterIds: string[];
};

export type OwnTestTopicSelection = {
	topicId: string;
	topicName: string;
	maxQuestions: number;
};

export type OwnTestChapterSelection = {
	chapterId: string;
	chapterName: string;
	maxQuestions: number;
	topicIds: string[];
	topics: OwnTestTopicSelection[];
};

export type OwnTestSubjectSelection = {
	subjectId: string;
	subjectSlug: string;
	subjectName: string;
	accent: number;
	/** Legacy manual field (kept for compatibility). */
	units?: OwnTestUnitSelection[];
	/** Random-mode field. */
	chapters?: OwnTestChapterSelection[];
	maxQuestions: number;
};

export type OwnTestSelectionSnapshot = {
	examId: string;
	boardId: string;
	subjects: OwnTestSubjectSelection[];
};

/** Payload shape when confirming question distribution (Continue). */
export type OwnTestDistributionContinueData = {
	subjects: {
		id: string;
		chapterGroup: {
			id: string;
			chapters: string[];
			numberOfQuestions: number;
			topics?: {
				id: string;
				numberOfQuestions: number;
			}[];
		}[];
	}[];
};

export type OwnTestTopicQuestionDistribution = {
	topicId: string;
	topicName: string;
	maxQuestions: number;
	questionCount: number;
};

export type OwnTestChapterQuestionDistribution = {
	chapterId: string;
	chapterName: string;
	maxQuestions: number;
	questionCount: number;
	topics: OwnTestTopicQuestionDistribution[];
};

export type OwnTestSubjectQuestionDistribution = {
	subjectId: string;
	subjectName: string;
	maxQuestions?: number;
	totalQuestions: number;
	chapters?: OwnTestChapterQuestionDistribution[];
	units?: Array<{
		unitId: string;
		unitName: string;
		questionCount: number;
	}>;
};

export function clampQuestions(total: number, maxQuestions: number): number {
	const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
	const safeMax = Math.max(0, Math.floor(Number.isFinite(maxQuestions) ? maxQuestions : 0));
	return Math.min(safeTotal, safeMax);
}

/** Legacy manual helpers (manual flow still unit-based). */
export const QUESTIONS_PER_SELECTED_UNIT = 100;

export function getMaxQuestionsForUnits(unitCount: number): number {
	const safeUnitCount = Math.max(0, Math.floor(Number.isFinite(unitCount) ? unitCount : 0));
	return safeUnitCount * QUESTIONS_PER_SELECTED_UNIT;
}

export function getMaxQuestionsForUnit(): number {
	return QUESTIONS_PER_SELECTED_UNIT;
}

export function distributeQuestionsAcrossUnits(total: number, unitCount: number): number[] {
	if (unitCount <= 0) return [];
	const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
	const base = Math.floor(safeTotal / unitCount);
	const remainder = safeTotal % unitCount;
	return Array.from({ length: unitCount }, (_, index) => (index < remainder ? base + 1 : base));
}

export function sumQuestions(rows: Array<{ questionCount: number }>): number {
	return rows.reduce((sum, row) => sum + Math.max(0, Math.floor(row.questionCount || 0)), 0);
}

/**
 * Weighted integer distribution under per-item caps.
 * Higher `caps[i]` receive proportionally higher allocation.
 */
export function distributeQuestionsWeighted(total: number, caps: number[]): number[] {
	const normalizedCaps = caps.map((cap) => Math.max(0, Math.floor(Number(cap) || 0)));
	const capacity = normalizedCaps.reduce((sum, cap) => sum + cap, 0);
	if (normalizedCaps.length === 0 || capacity === 0) return normalizedCaps.map(() => 0);

	const target = clampQuestions(total, capacity);
	if (target === 0) return normalizedCaps.map(() => 0);

	const rawShares = normalizedCaps.map((cap) => (target * cap) / capacity);
	const base = rawShares.map((share, idx) => Math.min(Math.floor(share), normalizedCaps[idx]));
	let allocated = base.reduce((sum, n) => sum + n, 0);

	if (allocated >= target) return base;

	const order = rawShares
		.map((share, idx) => ({ idx, frac: share - Math.floor(share), cap: normalizedCaps[idx] }))
		.sort((a, b) => {
			if (b.frac !== a.frac) return b.frac - a.frac;
			if (b.cap !== a.cap) return b.cap - a.cap;
			return a.idx - b.idx;
		});

	let cursor = 0;
	while (allocated < target) {
		const entry = order[cursor % order.length];
		if (base[entry.idx] < normalizedCaps[entry.idx]) {
			base[entry.idx] += 1;
			allocated += 1;
		}
		cursor += 1;
		if (cursor > order.length * Math.max(1, target)) break;
	}
	return base;
}

export function buildSubjectDistribution(
	subject: OwnTestSubjectSelection,
	totalQuestions: number
): OwnTestSubjectQuestionDistribution {
	const safeTotal = clampQuestions(totalQuestions, subject.maxQuestions);
	const chapters = subject.chapters ?? [];
	const chapterCaps = chapters.map((chapter) => chapter.maxQuestions);
	const chapterDistribution = distributeQuestionsWeighted(safeTotal, chapterCaps);

	return {
		subjectId: subject.subjectId,
		subjectName: subject.subjectName,
		maxQuestions: subject.maxQuestions,
		totalQuestions: safeTotal,
		chapters: chapters.map((chapter, index) => {
			const chapterTotal = chapterDistribution[index] ?? 0;
			const topicCaps = chapter.topics.map((topic) => topic.maxQuestions);
			const topicDistribution = distributeQuestionsWeighted(chapterTotal, topicCaps);
			return {
				chapterId: chapter.chapterId,
				chapterName: chapter.chapterName,
				maxQuestions: chapter.maxQuestions,
				questionCount: chapterTotal,
				topics: chapter.topics.map((topic, topicIndex) => ({
					topicId: topic.topicId,
					topicName: topic.topicName,
					maxQuestions: topic.maxQuestions,
					questionCount: topicDistribution[topicIndex] ?? 0
				}))
			};
		})
	};
}

export function buildDistributionBySubject(
	snapshot: OwnTestSelectionSnapshot,
	totalsBySubjectId: Record<string, number>
): Record<string, OwnTestSubjectQuestionDistribution> {
	const result: Record<string, OwnTestSubjectQuestionDistribution> = {};

	for (const subject of snapshot.subjects) {
		result[subject.subjectId] = buildSubjectDistribution(subject, totalsBySubjectId[subject.subjectId] ?? 0);
	}

	return result;
}