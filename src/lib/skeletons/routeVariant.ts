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
	/** Single-column placeholder for profile picker, marketing root, etc. */
	| 'generic-page';

function parsePathAndSearch(pathWithSearch: string) {
	const qIndex = pathWithSearch.indexOf('?');
	const path = (qIndex === -1 ? pathWithSearch : pathWithSearch.slice(0, qIndex)) || '';
	const search = qIndex === -1 ? '' : pathWithSearch.slice(qIndex + 1);
	const normalized = path.replace(/\/$/, '') || '/';
	return { path: normalized, params: new URLSearchParams(search) };
}

function examQuestionsFromParams(params: URLSearchParams): PageSkeletonVariant {
	return params.has('questionId') ? 'exam-question-detail' : 'exam-questions';
}

/**
 * Map SvelteKit `route.id` → skeleton. Order is specific → general.
 * See `.svelte-kit/non-ambient.d.ts` `RouteId()` for the full route list.
 */
export function variantFromRouteId(
	routeId: string | null | undefined,
	params: URLSearchParams,
): PageSkeletonVariant | null {
	if (!routeId) return null;

	// Data / auth routes are never shown inside the sidebar shell overlay
	if (routeId.startsWith('/api') || routeId.startsWith('/auth')) return null;

	// No overlay for full-screen flows
	if (routeId.includes('/test-attempt')) return null;
	if (routeId.includes('/tests/analysis')) return null;

	if (routeId.includes('/subscription')) return 'subscription';

	if (
		routeId.includes('/settings') ||
		routeId.includes('/profile/create') ||
		routeId === '/profiles' ||
		routeId === '/student/profiles' ||
		routeId.endsWith('/profile')
	) {
		return 'settings';
	}

	if (
		routeId.includes('student-management') ||
		routeId.includes('/users/teachers') ||
		routeId.includes('/users/students') ||
		routeId.includes('/users/relations') ||
		routeId === '/institute/users'
	) {
		return 'management-table';
	}

	if (/\/batch\/\[[^\]]+\]/.test(routeId)) return 'batch-detail';
	if (routeId.endsWith('/batch')) return 'batch-cards';

	if (routeId.includes('/tests/own/') && routeId.includes('/chapter/')) return 'question-list';
	if (routeId.includes('/tests/own')) return 'own-test-syllabus';

	if (routeId.includes('/tests/pyq') || routeId.includes('/tests/view')) return 'tests-list';
	if (routeId.includes('/tests')) return 'tests-list';

	if (routeId === '/student/dashboard') return 'student-dashboard';
	if (routeId.endsWith('/dashboard')) return 'portal-dashboard';

	// Public / top-level question bank
	if (routeId === '/questions/[chapterId]') return examQuestionsFromParams(params);
	if (routeId === '/questions') return 'exam-questions';

	// Student custom exam builder (subjects / units UI like own tests)
	if (routeId === '/student/custom') return 'own-test-syllabus';

	// Portal index pages (minimal shell)
	if (routeId === '/student' || routeId === '/teacher' || routeId === '/institute') {
		return 'portal-dashboard';
	}

	// --- Exam content (must run before generic `/subject` branch) ---
	if (routeId.includes('/questions/[chapterParam]')) return examQuestionsFromParams(params);
	if (routeId.endsWith('/questions')) return 'exam-questions';

	if (routeId === '/exams/[examSlug]/[chapterParam]') return examQuestionsFromParams(params);
	// +server under chapter (not a user-facing page layout)
	if (routeId.endsWith('/api')) return null;

	if (routeId.includes('/chapters')) return 'exam-chapters';
	if (routeId.includes('/subject')) return 'exam-chapters';

	if (routeId.includes('/exams/[examSlug]')) {
		return params.get('view') === 'chapters' ? 'exam-chapters' : 'exam-subjects';
	}

	if (/\/(student|teacher|institute)\/exams$/.test(routeId) || routeId === '/exams') {
		return 'exam-grid';
	}

	if (routeId.includes('/student/exam/')) return 'exam-subjects';
	/** Layout-only segment before `[examSlug]` (see `src/routes/student/exam/`). */
	if (routeId === '/student/exam') return 'exam-subjects';

	if (routeId === '/') return 'generic-page';

	return null;
}

/** Pathname fallback when `route.id` is not yet available during navigation. */
function variantFromPathname(path: string, params: URLSearchParams): PageSkeletonVariant | null {
	if (path === '/' || path === '') return 'generic-page';

	if (/\/student\/dashboard\/?$/.test(path)) return 'student-dashboard';
	if (/\/dashboard\/?$/.test(path)) return 'portal-dashboard';

	if (/\/subscription/.test(path)) return 'subscription';

	if (
		/\/settings\/?$/.test(path) ||
		/\/profile\/create/.test(path) ||
		path === '/profiles' ||
		path === '/student/profiles' ||
		/\/student\/profile\/?$/.test(path) ||
		/\/teacher\/profile\/?$/.test(path) ||
		/\/institute\/profile\/?$/.test(path)
	) {
		return 'settings';
	}

	if (
		/\/student-management/.test(path) ||
		/\/users\/(teachers|students|relations)/.test(path) ||
		path === '/institute/users'
	) {
		return 'management-table';
	}

	if (/\/batch\/[^/]+/.test(path)) return 'batch-detail';
	if (/\/batch\/?$/.test(path)) return 'batch-cards';

	if (/\/tests\/own\/[^/]+\/chapter\//.test(path)) return 'question-list';
	if (/\/tests\/own\/[^/]+/.test(path)) return 'own-test-syllabus';

	if (/\/tests(\/|$)/.test(path) && !/\/analysis\//.test(path) && !/\/test-attempt/.test(path)) {
		return 'tests-list';
	}

	if (path === '/student/custom') return 'own-test-syllabus';

	// Institute/teacher/student exam question bank (…/subject/…/questions[/chapter])
	if (/\/exams\/[^/]+\/subject\/[^/]+\/questions\/[^/]+/.test(path)) {
		return examQuestionsFromParams(params);
	}
	if (/\/exams\/[^/]+\/subject\/[^/]+\/questions\/?$/.test(path)) return 'exam-questions';

	if (/\/exams\/[^/]+\/(chapters|subject)(\/|$)/.test(path)) return 'exam-chapters';

	if (/\/exams\/[^/]+\/[^/]+/.test(path)) return examQuestionsFromParams(params);

	if (/\/exams\/[^/]+\/?$/.test(path)) {
		return params.get('view') === 'chapters' ? 'exam-chapters' : 'exam-subjects';
	}

	if (/\/exams(\/|$)/.test(path)) return 'exam-grid';

	if (/\/questions\/[^/]+/.test(path)) return examQuestionsFromParams(params);
	if (path === '/questions') return 'exam-questions';

	if (/\/student\/exam\/[^/]+/.test(path)) return 'exam-subjects';
	if (path === '/student/exam') return 'exam-subjects';

	if (path.includes('/exams/')) return 'exam-grid';
	if (path.includes('/tests/')) return 'tests-list';
	if (path.includes('/batch/')) return 'batch-detail';
	if (path.includes('/batch')) return 'batch-cards';

	return null;
}

export function getPageSkeletonVariant(
	pathWithSearch: string,
	routeId?: string | null,
): PageSkeletonVariant | null {
	if (!pathWithSearch?.trim()) return null;

	const { path, params } = parsePathAndSearch(pathWithSearch);
	return variantFromRouteId(routeId, params) ?? variantFromPathname(path, params);
}

export function shouldShowRouteSkeleton(
	variant: PageSkeletonVariant | null,
	opts: { navigating: boolean; isTestAttempt: boolean; navigationType: string | null },
): boolean {
	if (!opts.navigating || opts.isTestAttempt || opts.navigationType === 'enter') return false;
	return variant !== null;
}
