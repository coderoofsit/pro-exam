export const ANNOUNCEMENT_SUBTYPES = [
	{ value: 'ANNOUNCEMENT.GENERAL', label: 'General' },
	{ value: 'ANNOUNCEMENT.IMPORTANT', label: 'Important' },
	{ value: 'ANNOUNCEMENT.MAINTENANCE', label: 'Maintenance' },
	{ value: 'ANNOUNCEMENT.UPDATE', label: 'Platform update' },
	{ value: 'ANNOUNCEMENT.EVENT', label: 'Event' },
	{ value: 'ANNOUNCEMENT.STUDENT', label: 'Student notice' },
	{ value: 'ANNOUNCEMENT.TEACHER', label: 'Teacher notice' },
	{ value: 'ANNOUNCEMENT.INSTITUTE', label: 'Institute notice' }
] as const;

export const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
	ANNOUNCEMENT_SUBTYPES.map((item) => [item.value, item.label])
);

export function formatAnnouncementSubType(subType?: string | null): string {
	const key = subType?.trim();
	if (!key) return 'General';
	return ANNOUNCEMENT_TYPE_LABELS[key] || key.replace(/^ANNOUNCEMENT\./, '').replace(/_/g, ' ');
}
