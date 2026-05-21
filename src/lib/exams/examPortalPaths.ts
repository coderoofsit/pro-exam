/** Role-scoped exams hub paths (`/student/exams`, `/teacher/exams`, `/institute/exams`). */
export type ExamPortalRole = 'student' | 'teacher' | 'institute';

export const EXAMS_BASE_BY_ROLE: Record<ExamPortalRole, string> = {
	student: '/student/exams',
	teacher: '/teacher/exams',
	institute: '/institute/exams',
};

const PORTAL_EXAMS_RE = /^\/(student|teacher|institute)\/exams(?=\/|$)/;

/** Resolve exams root from current URL (`/teacher/exams/neet` → `/teacher/exams`, else `/exams`). */
export function resolveExamsBasePath(pathname: string): string {
	const m = pathname.match(PORTAL_EXAMS_RE);
	if (m) return `/${m[1]}/exams`;
	return '/exams';
}

export function examSlugHref(
	examsBase: string,
	slug: string,
	opts?: { pyq?: boolean },
): string {
	const base = examsBase.replace(/\/$/, '');
	const path = `${base}/${encodeURIComponent(slug)}`;
	if (opts?.pyq) return `${path}?pyq=true`;
	return path;
}

export function examChapterPath(
	examsBase: string,
	examSlug: string,
	chapterParam: string,
): string {
	const base = examsBase.replace(/\/$/, '');
	return `${base}/${encodeURIComponent(examSlug)}/${encodeURIComponent(chapterParam)}`;
}

export function examChapterHref(
	examsBase: string,
	examSlug: string,
	chapterParam: string,
	opts?: { page?: number; pyq?: boolean },
): string {
	const base = examsBase.replace(/\/$/, '');
	const params = new URLSearchParams();
	params.set('page', String(opts?.page ?? 1));
	if (opts?.pyq) params.set('pyq', 'true');
	return `${base}/${encodeURIComponent(examSlug)}/${encodeURIComponent(chapterParam)}?${params}`;
}

export function examSlugChaptersFallback(
	examsBase: string,
	examSlug: string,
	opts?: { pyq?: boolean },
): string {
	const base = examsBase.replace(/\/$/, '');
	const params = new URLSearchParams({ view: 'chapters' });
	if (opts?.pyq) params.set('pyq', 'true');
	return `${base}/${encodeURIComponent(examSlug)}?${params}`;
}
