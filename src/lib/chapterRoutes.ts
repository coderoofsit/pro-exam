/** 24-char hex Mongo ObjectId */
export function isMongoObjectIdString(s: string): boolean {
	return /^[a-f0-9]{24}$/i.test(s);
}

/**
 * Last segment for .../subject/{subjectSlug}/questions/{segment} — prefer slug when set.
 */
export function chapterQuestionsSegment(ch: { _id: string; slug?: string }): string {
	const s = ch.slug?.trim();
	if (s) return encodeURIComponent(s);
	return ch._id;
}

export function chapterQuestionsPath(
	examSlug: string,
	subjectSlug: string,
	chapter: { _id: string; slug?: string }
): string {
	const seg = chapterQuestionsSegment(chapter);
	return `/student/exams/${examSlug}/subject/${subjectSlug}/questions/${seg}`;
}
