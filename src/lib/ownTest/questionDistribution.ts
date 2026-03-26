/**
 * Own-test flow: snapshot of selected subjects → units → chapters, distribution
 * helpers, and types for manual unit-wise question counts.
 */

export type OwnTestUnitSelection = {
	unitId: string;
	unitName: string;
	chapterIds: string[];
};

export type OwnTestUnitQuestionDistribution = {
	unitId: string;
	unitName: string;
	questionCount: number;
};

export type OwnTestSubjectQuestionDistribution = {
	subjectId: string;
	subjectName: string;
	totalQuestions: number;
	units: OwnTestUnitQuestionDistribution[];
};

export type OwnTestSubjectSelection = {
	subjectId: string;
	subjectSlug: string;
	subjectName: string;
	accent: number;
	units: OwnTestUnitSelection[];
	maxQuestions: number;
};

export type OwnTestSelectionSnapshot = {
	subjects: OwnTestSubjectSelection[];
};

export const QUESTIONS_PER_SELECTED_UNIT = 100;

export function getMaxQuestionsForUnits(unitCount: number): number {
	const safeUnitCount = Math.max(0, Math.floor(Number.isFinite(unitCount) ? unitCount : 0));
	return safeUnitCount * QUESTIONS_PER_SELECTED_UNIT;
}

export function getMaxQuestionsForUnit(): number {
	return QUESTIONS_PER_SELECTED_UNIT;
}

export function sumUnitQuestions(units: { questionCount: number }[]): number {
	return units.reduce(
		(sum, unit) => sum + Math.max(0, Math.floor(unit.questionCount || 0)),
		0
	);
}

export function clampUnitQuestions(value: number, maxQuestions = QUESTIONS_PER_SELECTED_UNIT): number {
	const n = Math.floor(Number.isFinite(value) ? value : 0);
	return Math.min(Math.max(0, n), Math.max(0, Math.floor(maxQuestions)));
}

export function clampQuestions(total: number, maxQuestions: number): number {
	const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
	const safeMax = Math.max(0, Math.floor(Number.isFinite(maxQuestions) ? maxQuestions : 0));
	return Math.min(safeTotal, safeMax);
}

/**
 * Split `total` across `unitCount` units as evenly as possible using integers.
 * Remainder goes to the first units.
 *
 * @example distributeQuestionsAcrossUnits(10, 3) -> [4, 3, 3]
 */
export function distributeQuestionsAcrossUnits(total: number, unitCount: number): number[] {
	if (unitCount <= 0) return [];

	const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
	const base = Math.floor(safeTotal / unitCount);
	const remainder = safeTotal % unitCount;

	return Array.from({ length: unitCount }, (_, index) =>
		index < remainder ? base + 1 : base
	);
}

export function buildSubjectUnitDistribution(
	subject: OwnTestSubjectSelection,
	totalQuestions: number
): OwnTestSubjectQuestionDistribution {
	const safeTotal = clampQuestions(totalQuestions, subject.maxQuestions);
	const unitDistribution = distributeQuestionsAcrossUnits(safeTotal, subject.units.length);

	return {
		subjectId: subject.subjectId,
		subjectName: subject.subjectName,
		totalQuestions: safeTotal,
		units: subject.units.map((unit, index) => ({
			unitId: unit.unitId,
			unitName: unit.unitName,
			questionCount: unitDistribution[index] ?? 0
		}))
	};
}

export function buildDistributionBySubject(
	snapshot: OwnTestSelectionSnapshot,
	totalsBySubjectId: Record<string, number>
): Record<string, OwnTestSubjectQuestionDistribution> {
	const result: Record<string, OwnTestSubjectQuestionDistribution> = {};

	for (const subject of snapshot.subjects) {
		result[subject.subjectId] = buildSubjectUnitDistribution(
			subject,
			totalsBySubjectId[subject.subjectId] ?? 0
		);
	}

	return result;
}