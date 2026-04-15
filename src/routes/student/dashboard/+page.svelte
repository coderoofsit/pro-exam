<script lang="ts">
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ExamPaper from '$lib/components/ExamPaper.svelte';
	import type { Exam } from '$lib/api/exams';
	import { preloadData } from '$app/navigation';

	interface StreamedData {
		exams: Promise<Exam[]>;
	}
	let { data } = $props<{ data: { streamed: StreamedData } }>();

	const FEATURED_EXAMS_COUNT = 7;

	// preload for "Create Your Own Test"
	let ownTestsPreloaded = false;
	let ownTestsPreloadPromise: Promise<void> | null = null;

	function warmOwnTests() {
		if (ownTestsPreloaded || ownTestsPreloadPromise) return;

		ownTestsPreloadPromise = preloadData('/student/tests/own')
			.then(() => {
				ownTestsPreloaded = true;
			})
			.catch(() => {
				// allow retry on failure
			})
			.finally(() => {
				if (!ownTestsPreloaded) ownTestsPreloadPromise = null;
			});
	}

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
		if (typeof (exam as any).description === 'string') return (exam as any).description;
		return null;
	}
</script>

<svelte:head>
	<title>Student Home Page</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl min-w-0 text-[var(--page-text)]">
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

	<section class="min-w-0" aria-labelledby="pyq-heading">
		<div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h2 id="pyq-heading" class="text-lg font-bold text-[var(--page-text)] sm:text-xl">
				Chapter wise PYQ
			</h2>
			<a
				href="/student/exams?pyq=true"
				class="shrink-0 text-sm font-medium text-[var(--page-text)] underline-offset-4 hover:underline sm:text-right"
			>
				View All
			</a>
		</div>

		<div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
			{#await data.streamed.exams}
				{#each Array(FEATURED_EXAMS_COUNT) as _}
					<div class="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_26%,var(--sh-exam-card-border))] bg-[var(--sh-exam-card-bg)] px-3 py-3 text-center">
						<Skeleton width="w-9" height="h-9" rounded="rounded-full" />
						<Skeleton width="w-20" height="h-3" />
					</div>
				{/each}
			{:then exams}
				{#each exams.slice(0, FEATURED_EXAMS_COUNT) as exam (exam._id)}
					<ExamPaper
						id={exam._id}
						name={getExamNameEn(exam)}
						image={(exam as any).image ?? null}
						slug={getExamSlug(exam)}
						href={`/student-exam/${getExamSlug(exam)}?pyq=true`}
					/>
				{:else}
					<p class="col-span-full mt-4 text-sm text-[var(--page-text-muted)]">No exams available yet.</p>
				{/each}
			{:catch}
				<p class="col-span-full mt-4 text-sm text-semantic-error">Failed to load exams.</p>
			{/await}
		</div>
	</section>

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

		<div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
			{#await data.streamed.exams}
				{#each Array(FEATURED_EXAMS_COUNT) as _}
					<div class="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--accent-cta-pink)_26%,var(--sh-exam-card-border))] bg-[var(--sh-exam-card-bg)] px-3 py-3 text-center">
						<Skeleton width="w-9" height="h-9" rounded="rounded-full" />
						<Skeleton width="w-20" height="h-3" />
					</div>
				{/each}
			{:then exams}
				{#each exams.slice(0, FEATURED_EXAMS_COUNT) as exam (exam._id)}
					<ExamPaper
						id={exam._id}
						name={getExamNameEn(exam)}
						image={(exam as any).image ?? null}
						slug={getExamSlug(exam)}
						href={`/student-exam/${getExamSlug(exam)}`}
					/>
				{:else}
					<p class="col-span-full mt-4 text-sm text-[var(--page-text-muted)]">No exams available yet.</p>
				{/each}
			{:catch}
				<p class="col-span-full mt-4 text-sm text-semantic-error">Failed to load exams.</p>
			{/await}
		</div>
	</section>

		<section class="mt-10 min-w-0" aria-label="Quick actions">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
					onmouseenter={warmOwnTests}
					onfocus={warmOwnTests}
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
					data-sveltekit-preload-data="hover"
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

		<section class="mt-10 min-w-0" aria-label="WhatsApp community">
			<div
				class="flex flex-col items-start gap-4 rounded-2xl border-2 border-[var(--whatsapp-border-soft)] bg-[var(--whatsapp-bg,var(--dash-glass-bg))] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
			>
				<div class="flex min-w-0 items-start gap-3 sm:items-center">
					<span class="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="white" aria-hidden="true">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M12.031 2c-5.511 0-9.989 4.478-9.989 9.989 0 1.762.459 3.418 1.259 4.865l-1.301 4.746c-.085.312.193.59.505.505l4.746-1.301c1.447.8 3.103 1.259 4.865 1.259 5.511 0 9.989-4.478 9.989-9.989s-4.478-9.989-9.989-9.989zm4.29 13.911c-.131.365-.67.702-1.085.818-.287.08-.659.145-1.07.145-.534 0-1.197-.134-2.63-1.033-1.886-1.183-3.111-3.239-3.205-3.366-.095-.127-.773-1.03-0.773-1.962 0-.933.488-1.391.662-1.58.174-.189.381-.237.507-.237.126 0 .252 0 .361.004.113.004.266-.043.416.321.155.378.531 1.294.577 1.389.046.095.077.206.014.332-.063.126-.095.206-.189.317l-.286.332c-.095.11-.194.237-.083.428.111.19.491.81.1.053 1.05 1 2.222 1 3.125 1.488.232.115.42.146.574-.029.155-.174.662-.77.838-1.037.174-.266.348-.222.585-.135.237.087 1.5.707 1.751.834.252.127.42.189.482.296.063.106.063.614-.068.979z"
								fill="var(--whatsapp-brand)"
							/>
							<path
								d="M12.031 2.5c5.247 0 9.5 4.253 9.5 9.5s-4.253 9.5-9.5 9.5c-1.683 0-3.253-.438-4.618-1.201l-.224-.126-3.25.892.909-3.2-.14-.223A9.444 9.444 0 0 1 2.531 12c0-5.247 4.253-9.5 9.5-9.5z"
								fill="var(--whatsapp-brand)"
							/>
							<path
								d="M12.031 2c-5.511 0-9.989 4.478-9.989 9.989 0 1.762.459 3.418 1.259 4.865l-1.301 4.746c-.085.312.193.59.505.505l4.746-1.301c1.447.8 3.103 1.259 4.865 1.259 5.511 0 9.989-4.478 9.989-9.989s-4.478-9.989-9.989-9.989zm4.29 13.911c-.131.365-.67.702-1.085.818-.287.08-.659.145-1.07.145-.534 0-1.197-.134-2.63-1.033-1.886-1.183-3.111-3.239-3.205-3.366-.095-.127-.773-1.03-0.773-1.962 0-.933.488-1.391.662-1.58.174-.189.381-.237.507-.237.126 0 .252 0 .361.004.113.004.266-.043.416.321.155.378.531 1.294.577 1.389.046.095.077.206.014.332-.063.126-.095.206-.189.317l-.286.332c-.095.11-.194.237-.083.428.111.19.491.81.1.053 1.05 1 2.222 1 3.125 1.488.232.115.42.146.574-.029.155-.174.662-.77.838-1.037.174-.266.348-.222.585-.135.237.087 1.5.707 1.751.834.252.127.42.189.482.296.063.106.063.614-.068.979z"
								fill="white"
							/>
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
					<svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
						<path d="M12.031 2c-5.511 0-9.989 4.478-9.989 9.989 0 1.762.459 3.418 1.259 4.865l-1.301 4.746c-.085.312.193.59.505.505l4.746-1.301c1.447.8 3.103 1.259 4.865 1.259 5.511 0 9.989-4.478 9.989-9.989s-4.478-9.989-9.989-9.989zm4.29 13.911c-.131.365-.67.702-1.085.818-.287.08-.659.145-1.07.145-.534 0-1.197-.134-2.63-1.033-1.886-1.183-3.111-3.239-3.205-3.366-.095-.127-.773-1.03-0.773-1.962 0-.933.488-1.391.662-1.58.174-.189.381-.237.507-.237.126 0 .252 0 .361.004.113.004.266-.043.416.321.155.378.531 1.294.577 1.389.046.095.077.206.014.332-.063.126-.095.206-.189.317l-.286.332c-.095.11-.194.237-.083.428.111.19.491.81.1.053 1.05 1 2.222 1 3.125 1.488.232.115.42.146.574-.029.155-.174.662-.77.838-1.037.174-.266.348-.222.585-.135.237.087 1.5.707 1.751.834.252.127.42.189.482.296.063.106.063.614-.068.979z" />
					</svg>
					Join Community
				</a>
			</div>
		</section>

		<div class="relative mt-16 flex items-center justify-center">
			<div class="absolute inset-x-0 top-1/2 h-px bg-[var(--dash-divider)]"></div>
			<div class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--logo-divider-ring)] bg-[var(--page-bg)]">
				<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
					<path d="M8 6h6l4 6-4 6H8l4-6L8 6Z" fill="var(--logo-orange)" />
					<path d="M18 6h6l-4 6 4 6h-6l-4-6 4-6Z" fill="var(--logo-blue)" />
				</svg>
			</div>
		</div>

		<section class="mt-8 min-w-0 pb-6 text-center" aria-label="Social media links">
			<h2 class="text-xl font-bold text-[var(--page-text)] sm:text-2xl">We're on social media</h2>
			<p class="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--page-text-muted)]">
				Follow us &amp; share with your friends. It motivates us to keep working hard for you to bring new features &amp; keep the app FREE.
			</p>

			<div class="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
				<a
					href="https://youtube.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="4" width="20" height="16" rx="4" fill="var(--social-youtube)" />
						<path d="M10 8.5v7l5.5-3.5L10 8.5Z" fill="white" />
					</svg>
					YouTube
				</a>

				<a
					href="https://instagram.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<defs>
							<linearGradient id="ig" x1="2" y1="22" x2="22" y2="2">
								<stop stop-color="var(--social-ig-grad-1)" />
								<stop offset=".5" stop-color="var(--social-ig-grad-2)" />
								<stop offset="1" stop-color="var(--social-ig-grad-3)" />
							</linearGradient>
						</defs>
						<rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" />
						<rect x="5.5" y="5.5" width="13" height="13" rx="4" stroke="var(--social-instagram-accent)" stroke-width="1.5" fill="none" />
						<circle cx="12" cy="12" r="3.5" stroke="var(--social-instagram-accent)" stroke-width="1.5" fill="none" />
						<circle cx="17" cy="7" r="1" fill="var(--social-instagram-accent)" />
					</svg>
					Instagram
				</a>

				<a
					href="https://telegram.org"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="var(--social-telegram)" />
						<path d="M7 12.5l2.5 2L17 8l-1 8.5-3.5-2-1.5 2v-3L7 12.5Z" fill="white" />
					</svg>
					Telegram
				</a>

				<a
					href="https://facebook.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="var(--social-facebook)" />
						<path d="M15.5 12.5h-2V19h-3v-6.5H9V10h1.5V8.5c0-2 1-3 3-3h2V8h-1.5c-.6 0-.8.3-.8.8V10h2.3l-.5 2.5Z" fill="white" />
					</svg>
					Facebook
				</a>

				<a
					href="https://linkedin.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="2" width="20" height="20" rx="4" fill="var(--social-linkedin)" />
						<path d="M8 10v6M8 7.5v.01M11 16v-3.5c0-1.5 1-2 2-2s1.5.7 1.5 2V16M11 10v6" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					LinkedIn
				</a>

				<a
					href="https://whatsapp.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-[var(--dash-glass-border)] bg-[var(--dash-glass-bg)] px-4 py-3 text-sm font-medium text-[var(--page-text)] transition hover:border-[var(--dash-glass-hover-border)] hover:bg-[var(--dash-glass-hover-bg)]"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M12.031 2c-5.511 0-9.989 4.478-9.989 9.989 0 1.762.459 3.418 1.259 4.865l-1.301 4.746c-.085.312.193.59.505.505l4.746-1.301c1.447.8 3.103 1.259 4.865 1.259 5.511 0 9.989-4.478 9.989-9.989s-4.478-9.989-9.989-9.989zm4.29 13.911c-.131.365-.67.702-1.085.818-.287.08-.659.145-1.07.145-.534 0-1.197-.134-2.63-1.033-1.886-1.183-3.111-3.239-3.205-3.366-.095-.127-.773-1.03-0.773-1.962 0-.933.488-1.391.662-1.58.174-.189.381-.237.507-.237.126 0 .252 0 .361.004.113.004.266-.043.416.321.155.378.531 1.294.577 1.389.046.095.077.206.014.332-.063.126-.095.206-.189.317l-.286.332c-.095.11-.194.237-.083.428.111.19.491.81.1.053 1.05 1 2.222 1 3.125 1.488.232.115.42.146.574-.029.155-.174.662-.77.838-1.037.174-.266.348-.222.585-.135.237.087 1.5.707 1.751.834.252.127.42.189.482.296.063.106.063.614-.068.979z"
							fill="var(--social-whatsapp)"
						/>
					</svg>
					WhatsApp
				</a>
			</div>
	</section>
</div>