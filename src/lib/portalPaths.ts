/** Sidebar / layout role keys used across student, teacher, and institute portals. */
export type PortalRole = 'student' | 'tutor' | 'institute';

export function settingsPathForRole(role: PortalRole): string {
	const paths: Record<PortalRole, string> = {
		student: '/student/settings',
		tutor: '/teacher/settings',
		institute: '/institute/settings'
	};
	return paths[role];
}

/** Resolve settings URL from the current app path (e.g. `/teacher/...` → `/teacher/settings`). */
export function settingsPathFromPathname(pathname: string): string {
	if (pathname.startsWith('/teacher')) return settingsPathForRole('tutor');
	if (pathname.startsWith('/institute')) return settingsPathForRole('institute');
	return settingsPathForRole('student');
}
