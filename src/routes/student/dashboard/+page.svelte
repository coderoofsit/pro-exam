<script lang="ts">
	import type { Exam } from '$lib/api/exams';

	let { data } = $props<{ data: { exams: Exam[]; message: string | null } }>();

	const FEATURED_EXAMS_COUNT = 7;

	let exams = $state<Exam[]>([]);
	let examsFetchError = $state<string | null>(null);

	$effect(() => {
		exams = data.exams;
		examsFetchError = data.message;
	});

	const featuredExams = $derived(exams.slice(0, FEATURED_EXAMS_COUNT));

	// API type currently doesn't include `slug`, but backend responses likely do.
	// Fallback to `_id` so the page remains functional even if slug is missing.
	function getExamSlug(exam: Exam): string {
		return (exam as any).slug ?? exam._id;
	}

	function getExamNameEn(exam: Exam): string {
		const n = (exam as any).name;
		if (typeof n === 'string') return n;
		if (n && typeof n === 'object') return typeof n.en === 'string' ? n.en : '';
		return '';
	}

	function getExamSub(exam: Exam): string | null {
		const n = (exam as any).name;
		if (n && typeof n === 'object' && typeof n.hi === 'string') return n.hi;
		// Some endpoints might return description instead of hi.
		if (typeof (exam as any).description === 'string') return (exam as any).description;
		return null;
	}

</script>

<svelte:head>
	<title>Student Dashboard</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl min-w-0 text-[var(--page-text)]">
	{#if examsFetchError}
		<div class="flex min-h-[40vh] items-center justify-center text-semantic-error">{examsFetchError}</div>
	{:else}
		<!-- Hero banner -->
		<section class="mb-10 flex min-w-0 items-center justify-center gap-3 sm:gap-5">
			<img
				src="/Student-dash.png"
				alt="ExamFlow student mascot"
				class="student-dash-mascot h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
			/>
			<div>
				<h1 class="text-2xl font-extrabold tracking-tight sm:text-4xl">
					<span
						class="bg-gradient-to-r from-[var(--marketing-exam-a)] via-[var(--marketing-exam-b)] to-[var(--marketing-exam-c)] bg-clip-text text-transparent"
					>
						EXAM
					</span>
					<span
						class="bg-gradient-to-r from-[var(--marketing-flow-a)] to-[var(--marketing-flow-b)] bg-clip-text text-transparent"
					>
						FLOW
					</span>
				</h1>
				<p class="text-base font-semibold text-[var(--marketing-tagline)] sm:text-xl">For Students</p>
			</div>
		</section>

		<!-- Chapter wise PYQ -->
		<section class="min-w-0" aria-labelledby="pyq-heading">
			<div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="pyq-heading" class="text-lg font-bold text-[var(--page-text)] sm:text-xl">
					Chapter wise PYQ
				</h2>
				<a
					href="/student/exams"
					class="shrink-0 text-sm font-medium text-[var(--page-text)] underline-offset-4 hover:underline sm:text-right"
				>
					View All
				</a>
			</div>

			<div
				class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
			>
				{#each featuredExams as exam (exam._id)}
					<a
						href="/student/exams/{getExamSlug(exam)}/subject"
						class="group flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-link)]"
					>
						{#if exam.image}
							<img
								src={exam.image}
								alt=""
								class="h-9 w-9 shrink-0 rounded-full border border-[var(--page-card-border)] object-cover ring-1 ring-[var(--page-card-border)]"
							/>
						{:else}
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--page-card-border)] bg-[var(--page-avatar-bg)] text-xs font-bold text-[var(--page-avatar-text)] ring-1 ring-[var(--page-card-border)]"
							>
								{getExamNameEn(exam)[0]?.toUpperCase() ?? '?'}
							</div>
						{/if}
						<span
							class="line-clamp-2 w-full text-[13px] font-semibold leading-tight text-[var(--page-card-heading)] group-hover:text-[var(--page-link)]"
						>
							{getExamNameEn(exam)}
						</span>
						{#if getExamSub(exam)}
							<span class="line-clamp-1 w-full text-[11px] leading-tight text-[var(--page-card-sub)]">
								{getExamSub(exam)}
							</span>
						{/if}
					</a>
				{/each}
			</div>

			{#if featuredExams.length === 0}
				<p class="mt-4 text-sm text-[var(--page-text-muted)]">No exams available yet.</p>
			{/if}
		</section>

		<!-- Questions by Chapter -->
		<section class="mt-10 min-w-0" aria-labelledby="qbc-heading">
			<div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="qbc-heading" class="text-lg font-bold text-[var(--page-text)] sm:text-xl">
					Questions by Chapter
				</h2>
				<a
					href="/student/exams"
					class="shrink-0 text-sm font-medium text-[var(--page-text)] underline-offset-4 hover:underline sm:text-right"
				>
					View All
				</a>
			</div>

			<div
				class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
			>
				{#each featuredExams as exam (exam._id)}
					<a
						href="/student/exams/{getExamSlug(exam)}/subject"
						class="group flex min-h-[118px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] px-3 py-3 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--page-link)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-link)]"
					>
						{#if exam.image}
							<img
								src={exam.image}
								alt=""
								class="h-9 w-9 shrink-0 rounded-full border border-[var(--page-card-border)] object-cover ring-1 ring-[var(--page-card-border)]"
							/>
						{:else}
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--page-card-border)] bg-[var(--page-avatar-bg)] text-xs font-bold text-[var(--page-avatar-text)] ring-1 ring-[var(--page-card-border)]"
							>
								{getExamNameEn(exam)[0]?.toUpperCase() ?? '?'}
							</div>
						{/if}
						<span
							class="line-clamp-2 w-full text-[13px] font-semibold leading-tight text-[var(--page-card-heading)] group-hover:text-[var(--page-link)]"
						>
							{getExamNameEn(exam)}
						</span>
						{#if getExamSub(exam)}
							<span class="line-clamp-1 w-full text-[11px] leading-tight text-[var(--page-card-sub)]">
								{getExamSub(exam)}
							</span>
						{/if}
					</a>
				{/each}
			</div>

			{#if featuredExams.length === 0}
				<p class="mt-4 text-sm text-[var(--page-text-muted)]">No exams available yet.</p>
			{/if}
		</section>
		<section class="mt-10 min-w-0" aria-label="Quick actions">
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<a
					href="/student/tests/pyq"
					class="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-pink-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-pink-glow)] transition hover:border-[var(--cta-pink-border-hover)] hover:bg-[var(--dash-cta-hover-bg)] sm:min-h-[72px]"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-pink)]" aria-hidden="true">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
							<path
								d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linejoin="round"
							/>
							<path d="M9 9h6M9 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
						</svg>
					</span>
					<span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]">PYQ Mock Tests</span>
					<span
						class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
					>
						New
					</span>
					<span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
				</a>

				<a
					href="/student/tests/own"
					class="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-cyan-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-cyan-glow)] transition hover:border-[var(--cta-cyan-border-hover)] hover:bg-[var(--dash-cta-hover-bg)] sm:min-h-[72px]"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-cyan)]" aria-hidden="true">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
							<path
								d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
							<rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.6" />
							<path d="M9 12h6M9 15h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
						</svg>
					</span>
					<span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]">Create Your Own Test</span>
					<span
						class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
					>
						Updated
					</span>
					<span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
				</a>
				<a
					href="/student/batch"
					class="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--cta-cyan-border)] bg-[var(--dash-cta-bg)] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[var(--cta-cyan-glow)] transition hover:border-[var(--cta-cyan-border-hover)] hover:bg-[var(--dash-cta-hover-bg)] sm:min-h-[72px]"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--accent-cta-cyan)]" aria-hidden="true">
						<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
							<path
								d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							/>
							<rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.6" />
							<path d="M9 12h6M9 15h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
						</svg>
					</span>
					<span class="min-w-0 flex-1 font-semibold text-[var(--dash-cta-text)]">Your Batch Tests</span>
					<span
						class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]"
					>
						Updated
					</span>
					<span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
				</a>
			</div>
		</section>
		<!-- WhatsApp Community -->
		<section class="mt-10 min-w-0" aria-label="WhatsApp community">
			<div
				class="flex flex-col items-start gap-4 rounded-2xl border-2 border-[var(--whatsapp-border-soft)] bg-[var(--dash-glass-bg)] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
			>
				<div class="flex min-w-0 items-start gap-3 sm:items-center">
					<span class="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
						<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
							<circle cx="16" cy="16" r="14" fill="var(--whatsapp-brand)"/>
							<path d="M22.8 9.1a9.5 9.5 0 0 0-15.2 11l-1.1 4.1 4.2-1.1a9.5 9.5 0 0 0 12.1-14Zm-3 7.5c-.2.7-1.2 1.3-1.7 1.4-.4 0-.9.2-3-1-2.4-1.4-3.9-3.7-4-3.9-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .7.5.2.5.8 2 .9 2.1 0 .2 0 .3-.1.5l-.4.6c-.2.2-.3.4-.2.7.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1.2-.2.8-1 1-1.3.3-.3.5-.3.8-.2.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.1.1.7-.1 1.4Z" fill="white"/>
						</svg>
					</span>
					<div class="min-w-0">
						<p class="text-sm font-bold text-[var(--page-text)] sm:text-base">Join Our WhatsApp Community</p>
						<p class="mt-0.5 text-xs leading-relaxed text-[var(--page-text-muted)] sm:text-sm">
							Connect with peers, get instant updates, and receive exclusive study materials directly on WhatsApp.
						</p>
					</div>
				</div>
				<a
					href="https://whatsapp.com"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[var(--whatsapp-brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--whatsapp-shadow)] transition hover:bg-[var(--whatsapp-brand-hover)] hover:shadow-[var(--whatsapp-shadow-hover)] active:scale-[0.97]"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.2-.2.2-.7.9-.9 1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.4-.4c.1-.2.2-.3.1-.5 0-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.3-.3.3-1 1-1 2.5s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3 0-.1-.2-.2-.5-.3ZM12 21.5c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.6 1 1-3.5-.2-.4A9.4 9.4 0 0 1 12 2.5a9.5 9.5 0 0 1 0 19Z" fill="white"/>
					</svg>
					Join Community
				</a>
			</div>
		</section>
		<!-- Divider with logo -->
		<div class="relative mt-16 flex items-center justify-center">
			<div class="absolute inset-x-0 top-1/2 h-px bg-[var(--dash-divider)]"></div>
			<div class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--logo-divider-ring)] bg-[var(--page-bg)]">
				<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
					<path d="M8 6h6l4 6-4 6H8l4-6L8 6Z" fill="var(--logo-orange)"/>
					<path d="M18 6h6l-4 6 4 6h-6l-4-6 4-6Z" fill="var(--logo-blue)"/>
				</svg>
			</div>
		</div>

		<!-- Social media section -->
		<section class="mt-8 min-w-0 pb-6 text-center" aria-label="Social media links">
			<h2 class="text-xl font-bold text-[var(--page-text)] sm:text-2xl">We're on social media</h2>
			<p class="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--page-text-muted)]">
				Follow us &amp; share with your friends. It motivates us to keep working hard for you to bring new features &amp; keep the app FREE.
			</p>

			<div class="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
				<a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="4" width="20" height="16" rx="4" fill="var(--social-youtube)"/>
						<path d="M10 8.5v7l5.5-3.5L10 8.5Z" fill="white"/>
					</svg>
					YouTube
				</a>
				<a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<defs><linearGradient id="ig" x1="2" y1="22" x2="22" y2="2"><stop stop-color="var(--social-ig-grad-1)"/><stop offset=".5" stop-color="var(--social-ig-grad-2)"/><stop offset="1" stop-color="var(--social-ig-grad-3)"/></linearGradient></defs>
						<rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/>
						<rect x="5.5" y="5.5" width="13" height="13" rx="4" stroke="var(--social-instagram-accent)" stroke-width="1.5" fill="none"/>
						<circle cx="12" cy="12" r="3.5" stroke="var(--social-instagram-accent)" stroke-width="1.5" fill="none"/>
						<circle cx="17" cy="7" r="1" fill="var(--social-instagram-accent)"/>
					</svg>
					Instagram
				</a>
				<a href="https://telegram.org" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="var(--social-telegram)"/>
						<path d="M7 12.5l2.5 2L17 8l-1 8.5-3.5-2-1.5 2v-3L7 12.5Z" fill="white"/>
					</svg>
					Telegram
				</a>
				<a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="var(--social-facebook)"/>
						<path d="M15.5 12.5h-2V19h-3v-6.5H9V10h1.5V8.5c0-2 1-3 3-3h2V8h-1.5c-.6 0-.8.3-.8.8V10h2.3l-.5 2.5Z" fill="white"/>
					</svg>
					Facebook
				</a>
				<a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="2" width="20" height="20" rx="4" fill="var(--social-linkedin)"/>
						<path d="M8 10v6M8 7.5v.01M11 16v-3.5c0-1.5 1-2 2-2s1.5.7 1.5 2V16M11 10v6" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					LinkedIn
				</a>
				<a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="var(--social-whatsapp)"/>
						<path d="M16.6 14c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1-.2.2-.5.7-.7.8-.1.1-.3.1-.5 0-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4l.3-.3c.1-.1.1-.2.1-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.1 0-.4 0-.6.3-.2.2-.8.8-.8 1.9s.8 2.1.9 2.3c.1.1 1.5 2.4 3.7 3.3.5.2.9.4 1.2.5.5.1 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2ZM12 20c-1.4 0-2.7-.4-3.8-1.1l-.3-.2-2.7.7.8-2.7-.2-.3A7.2 7.2 0 0 1 12 4.7 7.3 7.3 0 0 1 12 20Z" fill="white"/>
					</svg>
					WhatsApp
				</a>
			</div>
		</section>
	{/if}
</div>
