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

function parsePathAndSearch(pathWithSearch: string) {
	const qIndex = pathWithSearch.indexOf('?');
	const path = (qIndex === -1 ? pathWithSearch : pathWithSearch.slice(0, qIndex)) || '';
	const search = qIndex === -1 ? '' : pathWithSearch.slice(qIndex + 1);
	return { path, params: new URLSearchParams(search) };
}

/** Prefer SvelteKit route id — stable during client navigations. */
export function variantFromRouteId(
	routeId: string | null | undefined,
	params: URLSearchParams,
): PageSkeletonVariant | null {
	if (!routeId) return null;

	if (routeId.includes('/subscription')) return 'subscription';
	if (routeId.includes('/settings') || routeId.includes('/profile/create')) return 'settings';
	if (
		routeId.includes('student-management') ||
		routeId.includes('/users/teachers') ||
		routeId.includes('/users/students') ||
		routeId.includes('/users/relations')
	) {
		return 'management-table';
	}

	if (/\/batch\/\[[^\]]+\]/.test(routeId)) return 'batch-detail';
	if (routeId.endsWith('/batch')) return 'batch-cards';

	if (routeId.includes('/tests/analysis')) return null;
	if (routeId.includes('/test-attempt')) return null;

	if (routeId.includes('/tests/own/') && routeId.includes('/chapter/')) return 'question-list';
	if (routeId.includes('/tests/own')) return 'own-test-syllabus';
	if (routeId.includes('/tests/pyq') || routeId.includes('/tests/view/')) return 'tests-list';
	if (routeId.includes('/tests')) return 'tests-list';

	if (routeId === '/student/dashboard') return 'student-dashboard';
	if (routeId.endsWith('/dashboard')) return 'portal-dashboard';

	if (routeId.includes('/questions/[chapterParam]') || routeId === '/exams/[examSlug]/[chapterParam]') {
		return params.has('questionId') ? 'exam-question-detail' : 'exam-questions';
	}
	if (routeId.includes('/questions/[chapterId]')) return 'exam-questions';

	if (routeId.includes('/chapters') || routeId.includes('/subject/')) return 'exam-chapters';

	if (routeId === '/exams/[examSlug]' || /\/exams\/\[examSlug\]$/.test(routeId)) {
		return params.get('view') === 'chapters' ? 'exam-chapters' : 'exam-subjects';
	}
	if (/\/(student|teacher|institute)\/exams$/.test(routeId) || routeId === '/exams') {
		return 'exam-grid';
	}

	return null;
}

/** Pick a skeleton layout from the destination URL during route transitions. */
export function getPageSkeletonVariant(
	pathWithSearch: string,
	routeId?: string | null,
): PageSkeletonVariant | null {
	if (!pathWithSearch) return null;

	const { path, params } = parsePathAndSearch(pathWithSearch);

	const fromRoute = variantFromRouteId(routeId, params);
	if (fromRoute) return fromRoute;

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
	if (/\/tests(\/|$)/.test(path) && !/\/analysis\//.test(path) && !/\/test-attempt/.test(path)) {
		return 'tests-list';
	}

	if (/\/exams\/[^/]+\/(chapters|subject)(\/|$)/.test(path)) return 'exam-chapters';
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
