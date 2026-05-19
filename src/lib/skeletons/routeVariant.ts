export type PageSkeletonVariant =
	| 'student-dashboard'
	| 'portal-dashboard'
	| 'exam-subjects'
	| 'exam-chapters'
	| 'exam-questions'
	| 'exam-question-detail'
	| 'exam-grid'
	| 'tests-list'
	| 'batch-cards'
	| 'batch-detail'
	| 'subscription'
	| 'management-table'
	| 'settings'
	| 'own-test-syllabus'
	| 'question-list'
	| 'default';

/** Pick a skeleton layout from the destination URL during route transitions. */
export function getPageSkeletonVariant(pathWithSearch: string): PageSkeletonVariant {
	const qIndex = pathWithSearch.indexOf('?');
	const path = (qIndex === -1 ? pathWithSearch : pathWithSearch.slice(0, qIndex)) || '';
	const search = qIndex === -1 ? '' : pathWithSearch.slice(qIndex + 1);
	const params = new URLSearchParams(search);

	if (/\/student\/dashboard\/?$/.test(path)) return 'student-dashboard';
	if (/\/dashboard\/?$/.test(path)) return 'portal-dashboard';
	if (/\/subscription/.test(path)) return 'subscription';
	if (/\/settings\/?$/.test(path) || /\/profile\/create/.test(path)) return 'settings';
	if (/\/(student-management|users\/(teachers|students|relations))/.test(path)) {
		return 'management-table';
	}
	if (/\/batch\/[^/]+/.test(path)) return 'batch-detail';
	if (/\/batch\/?$/.test(path)) return 'batch-cards';
	if (/\/tests\/own\/[^/]+\/chapter\//.test(path)) return 'question-list';
	if (/\/tests\/own\/[^/]+/.test(path)) return 'own-test-syllabus';
	if (/\/tests(\/|$)/.test(path) && !/\/analysis\//.test(path)) return 'tests-list';

	if (/\/exams\/[^/]+\/[^/]+/.test(path)) {
		if (params.has('questionId')) return 'exam-question-detail';
		return 'exam-questions';
	}
	if (/\/exams\/[^/]+\/?$/.test(path)) {
		if (params.get('view') === 'chapters') return 'exam-chapters';
		return 'exam-subjects';
	}
	if (/\/exams(\/|$)/.test(path)) return 'exam-grid';

	return 'default';
}
