/** Format a date in Asia/Kolkata as dd/mm/yyyy. */
export function formatIstDateDdMmYyyy(date: Date = new Date()): string {
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: 'Asia/Kolkata',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).format(date);
}
