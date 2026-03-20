<script lang="ts">
	import { createDashboardExamState } from './dashboard-exams.svelte.ts';

	const examState = createDashboardExamState();

	const pyqCardGradients = [
		'bg-gradient-to-br from-sky-100/95 via-indigo-50/90 to-violet-200/80',
		'bg-gradient-to-br from-amber-50/95 via-orange-100/85 to-rose-200/75',
		'bg-gradient-to-br from-emerald-50/95 via-teal-100/80 to-cyan-200/75',
		'bg-gradient-to-br from-fuchsia-100/90 via-purple-50/90 to-indigo-200/80'
	] as const;
</script>

<svelte:head>
	<title>Student Dashboard</title>
</svelte:head>

<div class="mx-auto w-full max-w-6xl min-w-0 text-white">
	{#if examState.loading && !examState.hasPage1}
		<div class="flex min-h-[40vh] items-center justify-center text-slate-400">Loading…</div>
	{:else if examState.error}
		<div class="flex min-h-[40vh] items-center justify-center text-red-400">{examState.error}</div>
	{:else}
		<!-- Hero banner -->
		<section class="mb-10 flex min-w-0 items-center justify-center gap-3 sm:gap-5">
			<img
				src="/Student-dash.png"
				alt="ExamFlow student mascot"
				class="h-20 w-20 shrink-0 object-contain mix-blend-screen sm:h-24 sm:w-24"
			/>
			<div>
				<h1 class="text-2xl font-extrabold tracking-tight sm:text-4xl">
					<span class="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#a855f7] bg-clip-text text-transparent">EXAM</span><span class="bg-gradient-to-r from-[#3b82f6] to-[#6366f1] bg-clip-text text-transparent">FLOW</span>
				</h1>
				<p class="text-base font-semibold text-[#a78bfa] sm:text-xl">For Students</p>
			</div>
		</section>

		<!-- Chapter wise PYQ -->
		<section class="min-w-0" aria-labelledby="pyq-heading">
			<div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="pyq-heading" class="text-lg font-bold text-white sm:text-xl">
					Chapter wise PYQ
				</h2>
				<a
					href="/student/exams"
					class="shrink-0 text-sm font-medium text-white underline-offset-4 hover:underline sm:text-right"
				>
					View All
				</a>
			</div>

			<div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
				{#each examState.displayExams as exam, i (exam._id)}
					<a
						href="/student/exams/{exam.slug}/chapters"
						class="group relative flex min-h-[148px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/25 p-4 text-left text-slate-900 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-white/20 no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(37,99,235,0.25)] hover:ring-white/40 sm:min-h-[156px] {pyqCardGradients[i % 4]}"
					>
						<div
							class="pointer-events-none absolute inset-0 opacity-[0.12]"
							style="background-image: radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 80%, rgb(59 130 246 / 0.35) 0, transparent 40%);"
							aria-hidden="true"
						></div>
						<div class="relative flex min-h-0 flex-1 flex-col">
							<div class="flex items-start justify-between gap-2">
								<p class="min-w-0 flex-1 text-sm font-bold leading-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] sm:text-base">
									{exam.name.en}
								</p>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/50 bg-white/55 text-slate-600 shadow-sm backdrop-blur-[2px]"
									aria-hidden="true"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
										<path
											d="M7 17L17 7M17 7H9M17 7V15"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
							</div>
							<div class="mt-auto flex justify-end pt-6">
								{#if exam.image}
									<img
										src={exam.image}
										alt=""
										class="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-md ring-1 ring-slate-200/60"
									/>
								{:else}
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-white to-emerald-600 text-xs font-bold text-slate-800 ring-2 ring-white/90 shadow-md"
									>
										✓
									</div>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>

			{#if examState.displayExams.length === 0 && !examState.loading}
				<p class="mt-4 text-sm text-slate-400">No exams available yet.</p>
			{/if}
		</section>

		<!-- Questions by Chapter -->
		<section class="mt-10 min-w-0" aria-labelledby="qbc-heading">
			<div class="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 id="qbc-heading" class="text-lg font-bold text-white sm:text-xl">
					Questions by Chapter
				</h2>
				<a
					href="/student/exams"
					class="shrink-0 text-sm font-medium text-white underline-offset-4 hover:underline sm:text-right"
				>
					View All
				</a>
			</div>

			<div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
				{#each examState.displayExams as exam, i (exam._id)}
					<a
						href="/student/exams/{exam.slug}/chapters"
						class="group relative flex min-h-[148px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/25 p-4 text-left text-slate-900 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-white/20 no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-8px_rgba(37,99,235,0.25)] hover:ring-white/40 sm:min-h-[156px] {pyqCardGradients[i % 4]}"
					>
						<div
							class="pointer-events-none absolute inset-0 opacity-[0.12]"
							style="background-image: radial-gradient(circle at 20% 20%, white 0, transparent 45%), radial-gradient(circle at 80% 80%, rgb(59 130 246 / 0.35) 0, transparent 40%);"
							aria-hidden="true"
						></div>
						<div class="relative flex min-h-0 flex-1 flex-col">
							<div class="flex items-start justify-between gap-2">
								<p class="min-w-0 flex-1 text-sm font-bold leading-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] sm:text-base">
									{exam.name.en}
								</p>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/50 bg-white/55 text-slate-600 shadow-sm backdrop-blur-[2px]"
									aria-hidden="true"
								>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
										<path
											d="M7 17L17 7M17 7H9M17 7V15"
											stroke="currentColor"
											stroke-width="1.75"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</span>
							</div>
							<div class="mt-auto flex justify-end pt-6">
								{#if exam.image}
									<img
										src={exam.image}
										alt=""
										class="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-md ring-1 ring-slate-200/60"
									/>
								{:else}
									<div
										class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-white to-emerald-600 text-xs font-bold text-slate-800 ring-2 ring-white/90 shadow-md"
									>
										✓
									</div>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>

			{#if examState.displayExams.length === 0 && !examState.loading}
				<p class="mt-4 text-sm text-slate-400">No exams available yet.</p>
			{/if}
		</section>

		<!-- CTA row: PYQ Mock Tests + Create Your Own Test -->
		<section class="mt-10 min-w-0" aria-label="Quick actions">
			<div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:gap-4">
				<a
					href="/student/tests"
					class="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#ec4899]/50 bg-[#1e2128] px-4 py-4 text-left shadow-[0_0_24px_rgba(236,72,153,0.12)] transition hover:border-[#ec4899]/80 hover:bg-[#23272f] sm:min-h-[72px]"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center text-[#ec4899]" aria-hidden="true">
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
					<span class="min-w-0 flex-1 font-semibold text-white">PYQ Mock Tests</span>
					<span
						class="shrink-0 rounded-md bg-[#f87171] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1a1a1a]"
					>
						New
					</span>
					<span class="text-white/70 transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
				</a>

				<a
					href="/student/tests"
					class="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#06b6d4]/50 bg-[#1e2128] px-4 py-4 text-left shadow-[0_0_24px_rgba(6,182,212,0.12)] transition hover:border-[#06b6d4]/80 hover:bg-[#23272f] sm:min-h-[72px]"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center text-[#06b6d4]" aria-hidden="true">
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
					<span class="min-w-0 flex-1 font-semibold text-white">Create Your Own Test</span>
					<span
						class="shrink-0 rounded-md bg-[#f87171] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1a1a1a]"
					>
						Updated
					</span>
					<span class="text-white/70 transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
				</a>
			</div>
		</section>
		<!-- WhatsApp Community -->
		<section class="mt-10 min-w-0" aria-label="WhatsApp community">
			<div class="flex flex-col items-start gap-4 rounded-2xl border-2 border-[#25D366]/40 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
				<div class="flex min-w-0 items-start gap-3 sm:items-center">
					<span class="flex h-10 w-10 shrink-0 items-center justify-center" aria-hidden="true">
						<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
							<circle cx="16" cy="16" r="14" fill="#25D366"/>
							<path d="M22.8 9.1a9.5 9.5 0 0 0-15.2 11l-1.1 4.1 4.2-1.1a9.5 9.5 0 0 0 12.1-14Zm-3 7.5c-.2.7-1.2 1.3-1.7 1.4-.4 0-.9.2-3-1-2.4-1.4-3.9-3.7-4-3.9-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .7.5.2.5.8 2 .9 2.1 0 .2 0 .3-.1.5l-.4.6c-.2.2-.3.4-.2.7.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1.2-.2.8-1 1-1.3.3-.3.5-.3.8-.2.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.1.1.7-.1 1.4Z" fill="white"/>
						</svg>
					</span>
					<div class="min-w-0">
						<p class="text-sm font-bold text-white sm:text-base">Join Our WhatsApp Community</p>
						<p class="mt-0.5 text-xs leading-relaxed text-slate-400 sm:text-sm">
							Connect with peers, get instant updates, and receive exclusive study materials directly on WhatsApp.
						</p>
					</div>
				</div>
				<a
					href="https://whatsapp.com"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(37,211,102,0.35)] transition hover:bg-[#1ebe5b] hover:shadow-[0_6px_20px_rgba(37,211,102,0.45)] active:scale-[0.97]"
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
			<div class="absolute inset-x-0 top-1/2 h-px bg-slate-700/60"></div>
			<div class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-400/40 bg-[var(--topbar-page-bg)]">
				<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
					<path d="M8 6h6l4 6-4 6H8l4-6L8 6Z" fill="#F97316"/>
					<path d="M18 6h6l-4 6 4 6h-6l-4-6 4-6Z" fill="#3B82F6"/>
				</svg>
			</div>
		</div>

		<!-- Social media section -->
		<section class="mt-8 min-w-0 pb-6 text-center" aria-label="Social media links">
			<h2 class="text-xl font-bold text-white sm:text-2xl">We're on social media</h2>
			<p class="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
				Follow us &amp; share with your friends. It motivates us to keep working hard for you to bring new features &amp; keep the app FREE.
			</p>

			<div class="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
				<a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="4" width="20" height="16" rx="4" fill="#FF0000"/>
						<path d="M10 8.5v7l5.5-3.5L10 8.5Z" fill="white"/>
					</svg>
					YouTube
				</a>
				<a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<defs><linearGradient id="ig" x1="2" y1="22" x2="22" y2="2"><stop stop-color="#FFDC80"/><stop offset=".5" stop-color="#F56040"/><stop offset="1" stop-color="#833AB4"/></linearGradient></defs>
						<rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/>
						<rect x="5.5" y="5.5" width="13" height="13" rx="4" stroke="#E1306C" stroke-width="1.5" fill="none"/>
						<circle cx="12" cy="12" r="3.5" stroke="#E1306C" stroke-width="1.5" fill="none"/>
						<circle cx="17" cy="7" r="1" fill="#E1306C"/>
					</svg>
					Instagram
				</a>
				<a href="https://telegram.org" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="#229ED9"/>
						<path d="M7 12.5l2.5 2L17 8l-1 8.5-3.5-2-1.5 2v-3L7 12.5Z" fill="white"/>
					</svg>
					Telegram
				</a>
				<a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="#1877F2"/>
						<path d="M15.5 12.5h-2V19h-3v-6.5H9V10h1.5V8.5c0-2 1-3 3-3h2V8h-1.5c-.6 0-.8.3-.8.8V10h2.3l-.5 2.5Z" fill="white"/>
					</svg>
					Facebook
				</a>
				<a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2"/>
						<path d="M8 10v6M8 7.5v.01M11 16v-3.5c0-1.5 1-2 2-2s1.5.7 1.5 2V16M11 10v6" stroke="white" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					LinkedIn
				</a>
				<a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer"
					class="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700/60 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:border-slate-500/80 hover:bg-white/[0.08]">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle cx="12" cy="12" r="10" fill="#25D366"/>
						<path d="M16.6 14c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1-.2.2-.5.7-.7.8-.1.1-.3.1-.5 0-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4l.3-.3c.1-.1.1-.2.1-.4 0-.1-.5-1.2-.7-1.7-.2-.4-.4-.4-.5-.4h-.5c-.1 0-.4 0-.6.3-.2.2-.8.8-.8 1.9s.8 2.1.9 2.3c.1.1 1.5 2.4 3.7 3.3.5.2.9.4 1.2.5.5.1 1 .1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1 0-.1-.2-.1-.4-.2ZM12 20c-1.4 0-2.7-.4-3.8-1.1l-.3-.2-2.7.7.8-2.7-.2-.3A7.2 7.2 0 0 1 12 4.7 7.3 7.3 0 0 1 12 20Z" fill="white"/>
					</svg>
					WhatsApp
				</a>
			</div>
		</section>
	{/if}
</div>
