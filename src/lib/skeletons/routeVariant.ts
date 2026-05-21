export type PageSkeletonVariant =
	| 'student-dashboard'
	| 'portal-dashboard'
	| 'exam-subjects'
	| 'exam-chapters'
	| 'exam-questions'
	| 'exam-chapter-questions'
	| 'exam-question-detail'
	| 'exam-grid'
	| 'tests-list'
	| 'batch-cards'
	| 'student-batch-detail'
	| 'batch-detail'
	| 'subscription'
	| 'management-table'
	| 'settings'
	| 'own-test-syllabus'
	| 'question-list'
	| 'generic-page'
	| 'pyq-exam-papers';

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

/** `/exams/.../chapterId` (and portal copies) — list skeleton separate from generic question bank */
function examChapterQuestionsFromParams(params: URLSearchParams): PageSkeletonVariant {
	return params.has('questionId') ? 'exam-question-detail' : 'exam-chapter-questions';
}

function isExamChapterQuestionsRouteId(routeId: string): boolean {
	return (
		routeId === '/exams/[examSlug]/[chapterParam]' ||
		routeId === '/student/exams/[examSlug]/[chapterParam]' ||
		routeId === '/teacher/exams/[examSlug]/[chapterParam]' ||
		routeId === '/institute/exams/[examSlug]/[chapterParam]'
	);
}

function pathnameIsExamChapterQuestionList(path: string): boolean {
	const p = path.replace(/\/$/, '') || '/';
	if (/\/exams\/[^/]+\/(chapters|subject)(\/|$)/.test(p)) return false;
	if (/\/(?:student|teacher|institute)\/exams\/[^/]+\/(chapters|subject)(\/|$)/.test(p)) return false;
	return (
		/^\/exams\/[^/]+\/[^/]+$/.test(p) ||
		/^\/(?:student|teacher|institute)\/exams\/[^/]+\/[^/]+$/.test(p)
	);
}

/** First-time profile onboarding — full-page form, not settings layout; no shell overlay. */
export function isProfileCreatePath(path: string): boolean {
	return /\/(student|teacher|institute)\/profile\/create\/?$/.test(path);
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

	/* Subscription: static chrome + partial skeletons in +page.svelte */
	if (routeId.includes('/subscription')) return null;

	if (
		routeId === '/student/profile/create' ||
		routeId === '/teacher/profile/create' ||
		routeId === '/institute/profile/create'
	) {
		return null;
	}

	if (
		routeId.includes('/settings') ||
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

	if (/\/student\/batch\/\[[^\]]+\]/.test(routeId)) return 'student-batch-detail';
	if (/\/(teacher|institute)\/batch\/\[[^\]]+\]/.test(routeId)) return 'batch-detail';
	if (/\/batch\/\[[^\]]+\]/.test(routeId)) return 'batch-detail';
	if (
		routeId === '/student/batch' ||
		routeId === '/teacher/batch' ||
		routeId === '/institute/batch'
	) {
		return 'batch-cards';
	}

	// PYQ + own-tests: order matters — `/tests/own` hub has no route overlay (sync load);
	// `[examSlug]` uses own-test-syllabus, not PYQ exam-grid.
	if (routeId.includes('/tests/pyq/')) {
		if (/\/tests\/pyq\/\[examSlug\]\/\[paperSlug\]$/.test(routeId)) {
			return params.has('questionId') ? 'exam-question-detail' : null;
		}
		if (/\/tests\/pyq\/\[examSlug\]$/.test(routeId)) return 'pyq-exam-papers';
	}
	if (/\/(student|teacher|institute)\/tests\/pyq$/.test(routeId)) return 'exam-grid';

	if (/\/(student|teacher|institute)\/tests\/own\/[^/]+\/chapter\//.test(routeId)) return 'question-list';
	/* Own exam builder: back + syllabus skeleton live in +page.svelte (layout stream) */
	if (/\/(student|teacher|institute)\/tests\/own\/\[examSlug\]$/.test(routeId)) return null;
	/* Own-tests hub: exams load in +page.server (no streamed shell) — no route overlay */
	if (/\/(student|teacher|institute)\/tests\/own$/.test(routeId)) return null;

	/* View-test page loads questions client-side; `QuestionListSkeleton` in pyq paper page */
	if (routeId.includes('/tests/view')) return null;

	if (routeId.endsWith('/tests/batch')) return null;

	/* Tests hub: CTAs + search are static; list skeleton is in +page.svelte (#await) */
	if (
		routeId === '/student/tests' ||
		routeId === '/teacher/tests' ||
		routeId === '/institute/tests'
	) {
		return null;
	}

	// Other /…/tests/* routes — avoid misleading overlays; shell keeps prior view briefly
	if (routeId.includes('/tests')) return null;

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

	if (isExamChapterQuestionsRouteId(routeId)) return examChapterQuestionsFromParams(params);
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

	if (/\/subscription/.test(path)) return null;

	if (isProfileCreatePath(path)) return null;

	if (
		/\/settings\/?$/.test(path) ||
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

	if (/\/student\/batch\/[^/]+/.test(path)) return 'student-batch-detail';
	if (/\/(teacher|institute)\/batch\/[^/]+/.test(path)) return 'batch-detail';
	if (/\/batch\/[^/]+/.test(path)) return 'batch-detail';
	if (path === '/student/batch' || path === '/teacher/batch' || path === '/institute/batch') {
		return 'batch-cards';
	}

	// PYQ before `/tests/own*` — during navigations pathname can briefly lag; merge layer also
	// reconciles own↔pyq when `route.id` and pathname disagree.
	if (/\/tests\/pyq\/[^/]+\/[^/]+$/.test(path)) {
		return params.has('questionId') ? 'exam-question-detail' : null;
	}
	if (/\/tests\/pyq\/[^/]+$/.test(path)) return 'pyq-exam-papers';
	if (/\/tests\/pyq\/?$/.test(path)) return 'exam-grid';

	if (/\/tests\/own\/[^/]+\/chapter\//.test(path)) return 'question-list';
	if (/\/tests\/own\/[^/]+\/?$/.test(path) && !/\/tests\/own\/[^/]+\/chapter\//.test(path)) return null;
	/* Own-tests hub: no exam-grid overlay (data ready when page renders) */
	if (/\/tests\/own\/?$/.test(path)) return null;

	if (/\/tests\/view\/[^/]+\/?$/.test(path)) return null;

	if (/\/(student|teacher|institute)\/tests\/batch\/?$/.test(path)) return null;

	if (path === '/student/tests' || path === '/teacher/tests' || path === '/institute/tests') {
		return null;
	}

	// Unmatched tests subpaths: no sidebar overlay (avoids generic-page flash)
	if (
		/\/(student|teacher|institute)\/tests\//.test(path) &&
		!/\/analysis\//.test(path) &&
		!/\/test-attempt/.test(path)
	) {
		return null;
	}

	if (path === '/student/custom') return 'own-test-syllabus';

	// Institute/teacher/student exam question bank (…/subject/…/questions[/chapter])
	if (/\/exams\/[^/]+\/subject\/[^/]+\/questions\/[^/]+/.test(path)) {
		return examQuestionsFromParams(params);
	}
	if (/\/exams\/[^/]+\/subject\/[^/]+\/questions\/?$/.test(path)) return 'exam-questions';

	if (/\/exams\/[^/]+\/(chapters|subject)(\/|$)/.test(path)) return 'exam-chapters';

	if (pathnameIsExamChapterQuestionList(path)) return examChapterQuestionsFromParams(params);

	if (/\/exams\/[^/]+\/?$/.test(path)) {
		return params.get('view') === 'chapters' ? 'exam-chapters' : 'exam-subjects';
	}

	if (/\/exams(\/|$)/.test(path)) return 'exam-grid';

	if (/\/questions\/[^/]+/.test(path)) return examQuestionsFromParams(params);
	if (path === '/questions') return 'exam-questions';

	if (/\/student\/exam\/[^/]+/.test(path)) return 'exam-subjects';
	if (path === '/student/exam') return 'exam-subjects';

	if (path.includes('/exams/')) return 'exam-grid';

	return null;
}

const LAYOUT_ONLY_ROUTE_IDS = new Set(['/student', '/teacher', '/institute']);

/** When pathname still shows own-tests but `route.id` already resolved to PYQ (or the reverse). */
function testsOwnPyqBranchMismatch(path: string, routeId: string | null | undefined): boolean {
	const r = routeId ?? '';
	if (!/\/(student|teacher|institute)\/tests\//.test(path)) return false;
	if (!/\/(student|teacher|institute)\/tests\//.test(r)) return false;

	const pathOwn = /\/tests\/own(\/|$)/.test(path);
	const pathPyq = /\/tests\/pyq(\/|$)/.test(path);
	const idOwn = /\/tests\/own(\/|$)/.test(r);
	const idPyq = /\/tests\/pyq(\/|$)/.test(r);

	return pathOwn !== idOwn || pathPyq !== idPyq;
}

/**
 * Combine `route.id` and pathname skeletons. During client navigations, `to.route.id`
 * can briefly be a layout id (e.g. `/teacher`) or the previous leaf (e.g. `…/dashboard`)
 * while `to.url` already reflects the destination — `??` would keep the wrong variant
 * because `portal-dashboard` is truthy. Prefer pathname when it disagrees in those cases.
 */
function mergeRouteAndPathVariant(
	path: string,
	params: URLSearchParams,
	routeId: string | null | undefined,
): PageSkeletonVariant | null {
	const fromPath = variantFromPathname(path, params);
	const fromId = variantFromRouteId(routeId, params);

	if (isProfileCreatePath(path)) return null;

	// For /tests routes, destination URL is usually the source of truth — except when pathname
	// still reflects `/tests/own/...` while `route.id` already shows `/tests/pyq` (or vice versa).
	if (/\/(student|teacher|institute)\/tests(\/|$)/.test(path)) {
		if (testsOwnPyqBranchMismatch(path, routeId)) {
			return fromId ?? fromPath;
		}
		return fromPath ?? fromId;
	}
	// Apply destination-first resolution for batch routes as well.
	if (/\/batch(\/|$)/.test(path)) {
		return fromPath ?? fromId;
	}

	if (fromPath !== null && routeId && LAYOUT_ONLY_ROUTE_IDS.has(routeId)) {
		return fromPath;
	}

	if (fromId === fromPath) return fromId;
	if (fromPath === null) return fromId;
	if (fromId === null) return fromPath;

	if (
		fromId === 'batch-cards' &&
		(fromPath === 'batch-detail' || fromPath === 'student-batch-detail') &&
		/\/(student|teacher|institute)\/batch\/[^/]+/.test(path)
	) {
		return fromPath;
	}

	const pathLooksLikeDashboard = /\/(student|teacher|institute)\/dashboard\/?$/.test(path);
	const pathIsPortalRoot =
		path === '/student' || path === '/teacher' || path === '/institute';

	if (
		(fromId === 'portal-dashboard' || fromId === 'student-dashboard') &&
		!pathLooksLikeDashboard &&
		!pathIsPortalRoot
	) {
		return fromPath;
	}

	return fromId;
}

export function getPageSkeletonVariant(
	pathWithSearch: string,
	routeId?: string | null,
): PageSkeletonVariant | null {
	if (!pathWithSearch?.trim()) return null;

	const { path, params } = parsePathAndSearch(pathWithSearch);
	return mergeRouteAndPathVariant(path, params, routeId);
}

function normalizePathOnly(path: string): string {
	return path.replace(/\/$/, '') || '/';
}

function portalBatchRoot(path: string): string | null {
	const m = path.match(/^(\/(?:student|teacher|institute))\/batch/);
	return m?.[1] ?? null;
}

function isPortalBatchDetailPath(path: string): boolean {
	return (
		/\/student\/batch\/[^/]+/.test(path) ||
		/\/(teacher|institute)\/batch\/[^/]+/.test(path)
	);
}

function isUnderPortalBatchTree(path: string): boolean {
	return /\/(student|teacher|institute)\/batch(\/|$)/.test(path);
}

/**
 * List → detail (or detail → detail) under the same portal already uses an in-page
 * table skeleton on the batch slug page. Skipping the shell overlay avoids stacking
 * two full-page skeletons plus the real chrome (feels like “multiple loaders”).
 */
export function shouldSuppressBatchRouteOverlay(
	fromUrl: URL | null | undefined,
	toPathWithSearch: string,
): boolean {
	if (!fromUrl) return false;
	const from = normalizePathOnly(fromUrl.pathname);
	const to = parsePathAndSearch(toPathWithSearch).path;

	if (!isPortalBatchDetailPath(to)) return false;
	if (!isUnderPortalBatchTree(from) || !isUnderPortalBatchTree(to)) return false;

	const rootFrom = portalBatchRoot(from);
	const rootTo = portalBatchRoot(to);
	return rootFrom !== null && rootFrom === rootTo;
}

/** Manual/Random on `/tests/own` only updates `?mode=` — no full-page route skeleton. */
function isOwnTestsHubPath(path: string): boolean {
	return /\/(student|teacher|institute)\/tests\/own$/.test(normalizePathOnly(path));
}

export function shouldSuppressOwnTestsHubOverlay(
	fromUrl: URL | null | undefined,
	toPathWithSearch: string,
): boolean {
	if (!fromUrl) return false;
	const from = normalizePathOnly(fromUrl.pathname);
	const to = parsePathAndSearch(toPathWithSearch).path;
	return isOwnTestsHubPath(from) && isOwnTestsHubPath(to);
}

/** Pagination/filters on own-test chapter only change query — skip full-page route skeleton. */
function isOwnTestChapterPath(path: string): boolean {
	return /\/(student|teacher|institute)\/tests\/own\/[^/]+\/chapter\/[^/]+$/.test(
		normalizePathOnly(path),
	);
}

export function shouldSuppressOwnTestChapterOverlay(
	fromUrl: URL | null | undefined,
	toPathWithSearch: string,
): boolean {
	if (!fromUrl) return false;
	const from = normalizePathOnly(fromUrl.pathname);
	const to = parsePathAndSearch(toPathWithSearch).path;
	return isOwnTestChapterPath(from) && isOwnTestChapterPath(to) && from === to;
}

export function shouldShowRouteSkeleton(
	variant: PageSkeletonVariant | null,
	opts: {
		navigating: boolean;
		isTestAttempt: boolean;
		navigationType: string | null;
		destinationPath?: string;
	},
): boolean {
	if (!opts.navigating || opts.isTestAttempt || opts.navigationType === 'enter') return false;
	if (opts.destinationPath && isProfileCreatePath(parsePathAndSearch(opts.destinationPath).path)) {
		return false;
	}
	return variant !== null;
}
