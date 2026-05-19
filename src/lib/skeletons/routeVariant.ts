export type PageSkeletonVariant =
	| 'dashboard'
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
export function getPageSkeletonVariant(pathname: string): PageSkeletonVariant {
	const path = pathname.split('?')[0] ?? '';

	if (/\/dashboard\/?$/.test(path)) return 'dashboard';
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
	if (/\/exams(\/|$)/.test(path)) return 'exam-grid';

	return 'default';
}
