<script lang="ts">
	import { onMount } from "svelte";
	import type { PageData } from "./$types";
	import { Chart, registerables } from "chart.js";
	import MathText from "$lib/components/MathText.svelte";
	import AdvancedAnalysis from "$lib/components/AdvancedAnalysis.svelte";

	Chart.register(...registerables);

	let { data } = $props<{ data: PageData }>();
	const summary = $derived(data.summary);
	const testName = $derived(data.testName || "Detailed Analysis");

	// ── derived helpers ──────────────────────────────────────────────────────
	const questions = $derived<any[]>(summary?.questions ?? []);
	const bySubject = $derived<any[]>(summary?.statsBreakdown?.bySubject ?? []);
	const byChapter = $derived<any[]>(summary?.statsBreakdown?.byChapter ?? []);
	const byChapterGroup = $derived<any[]>(
		summary?.statsBreakdown?.byChapterGroup ?? [],
	);
	const byKind = $derived<any[]>(summary?.statsBreakdown?.byKind ?? []);

	// ── question preview sidebar ─────────────────────────────────────────────
	let previewOpen = $state(false);
	let previewFilter = $state<"all" | "correct" | "incorrect" | "unattempted">(
		"all",
	);
	let previewIndex = $state(0);

	const filteredQuestions = $derived.by(() => {
		if (previewFilter === "correct")
			return questions.filter((q) => q.isCorrect === true);
		if (previewFilter === "incorrect")
			return questions.filter(
				(q) => q.isAttempted && q.isCorrect === false,
			);
		if (previewFilter === "unattempted")
			return questions.filter((q) => !q.isAttempted);
		return questions;
	});

	const previewQuestion = $derived(filteredQuestions[previewIndex] ?? null);

	function openPreview(filter: typeof previewFilter, idx = 0) {
		previewFilter = filter;
		previewIndex = idx;
		previewOpen = true;
	}

	// ── donut chart ──────────────────────────────────────────────────────────
	let donutCanvas = $state<HTMLCanvasElement | null>(null);
	let donutChart: Chart | null = null;

	function buildDonut() {
		if (!donutCanvas || !summary) return;
		if (donutChart) donutChart.destroy();
		const isDark =
			document.documentElement.getAttribute("data-theme") === "dark";

		const marksEarned = Math.max(0, summary.obtainedMarks);
		const marksRemaining = Math.max(0, summary.totalMarks - marksEarned);

		// Calculate accuracy for the chart donut if preferred,
		// but since we show "Accuracy" label in overlay, let's use Accuracy count vs remaining
		const accuracyVal = summary.accuracy;
		const remainingVal = 100 - accuracyVal;

		donutChart = new Chart(donutCanvas, {
			type: "doughnut",
			data: {
				labels: ["Accuracy", "Remaining"],
				datasets: [
					{
						data: [accuracyVal, remainingVal],
						backgroundColor: [
							"#10b981",
							isDark ? "#3f3f46" : "#f1f5f9",
						],
						borderWidth: 0,
						borderRadius: 10,
					},
				],
			},
			options: {
				cutout: "85%",
				plugins: {
					legend: { display: false },
					tooltip: { enabled: false },
				},
				responsive: true,
				maintainAspectRatio: false,
			},
		});
	}

	onMount(() => {
		buildDonut();
		const obs = new MutationObserver(buildDonut);
		obs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => obs.disconnect();
	});

	// ── helpers ───────────────────────────────────────────────────────────────
	function fmt(ms: number) {
		const s = Math.floor(ms / 1000);
		const m = Math.floor(s / 60);
		const sec = s % 60;
		if (m === 0) return `${sec}s`;
		return `${m}m ${sec}s`;
	}

	function pct(n: number, d: number) {
		if (!d) return 0;
		return Math.round((n / d) * 100);
	}

	function subjectName(sub: any) {
		return sub?.subjectId?.name?.en ?? sub?.subjectId?.name ?? "Subject";
	}

	// question numbers for question map
	const correctNums = $derived(
		questions
			.map((q, i) => (q.isCorrect === true ? i + 1 : null))
			.filter(Boolean) as number[],
	);
	const incorrectNums = $derived(
		questions
			.map((q, i) =>
				q.isAttempted && q.isCorrect === false ? i + 1 : null,
			)
			.filter(Boolean) as number[],
	);
	const unattemptedNums = $derived(
		questions
			.map((q, i) => (!q.isAttempted ? i + 1 : null))
			.filter(Boolean) as number[],
	);

	const negativeMarks = $derived(
		questions.reduce(
			(acc, q) =>
				acc +
				(q.isAttempted && q.isCorrect === false
					? (q.negMarks ?? 0)
					: 0),
			0,
		),
	);
</script>

<svelte:head>
	<title>Analysis — {testName}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if summary}
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- MAIN PAGE                                                               -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<div class="ap">
		<!-- ── Header ── -->
		<div class="ap-header">
			<div class="ap-header-inner">
				<button
					type="button"
					onclick={() => history.back()}
					class="back-btn"
					aria-label="Back"
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
						><path
							d="M15 18L9 12L15 6"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/></svg
					>
				</button>
				<div class="header-center">
					<h1 class="ap-title">{testName}</h1>
					<p class="ap-sub">
						Submitted · {summary.questionCount ?? questions.length} Questions
						· {summary.testSnapshot?.durationMinutes ?? "—"} min
					</p>
				</div>
				<span class="ap-badge"
					>{summary.testSnapshot?.kind ?? "CUSTOM"}</span
				>
			</div>
		</div>

		<div class="ap-body">
			<!-- ── Performance Hero Section ── -->
			<section class="hero-stats">
				<div class="hero-main-card">
					<div class="hero-score-col">
						<p class="hero-over-label">Your Total Score</p>
						<div class="hero-score-val">
							<span class="num">{summary.obtainedMarks}</span>
							<span class="slash">/</span>
							<span class="total">{summary.totalMarks}</span>
						</div>
						<div class="hero-accuracy-tag">
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="12" cy="12" r="10" /><circle
									cx="12"
									cy="12"
									r="6"
								/><circle cx="12" cy="12" r="2" /></svg
							>
							{summary.accuracy.toFixed(2)}% Accuracy
						</div>
					</div>

					<div class="hero-chart-col">
						<div class="hero-chart-wrap">
							<canvas
								bind:this={donutCanvas}
								width="160"
								height="160"
							></canvas>
							<div class="hero-chart-overlay">
								<b>{summary.accuracy.toFixed(2)}%</b>
								<span>Accuracy</span>
							</div>
						</div>
					</div>

					<div class="hero-breakdown-col">
						<div class="hb-item green">
							<div class="hb-top">
								<div class="hb-icon-small">✓</div>
								<span class="hb-num"
									>{summary.correctCount}</span
								>
							</div>
							<span class="hb-lbl">CORRECT</span>
						</div>
						<div class="hb-item red">
							<div class="hb-top">
								<div class="hb-icon-small">✕</div>
								<span class="hb-num"
									>{summary.incorrectCount}</span
								>
							</div>
							<span class="hb-lbl">WRONG</span>
						</div>
						<div class="hb-item gray">
							<div class="hb-top">
								<div class="hb-icon-small">−</div>
								<span class="hb-num"
									>{summary.unattemptedCount}</span
								>
							</div>
							<span class="hb-lbl">SKIPPED</span>
						</div>
					</div>

					<div class="hero-bottom-bar">
						{#if summary.correctCount > 0}
							<div
								class="bar-fill correct"
								style="width: {pct(
									summary.correctCount,
									questions.length,
								)}%"
							>
								<span>{summary.correctCount} CORRECT</span>
							</div>
						{/if}
						{#if summary.incorrectCount > 0}
							<div
								class="bar-fill wrong"
								style="width: {pct(
									summary.incorrectCount,
									questions.length,
								)}%"
							>
								<span>{summary.incorrectCount} WRONG</span>
							</div>
						{/if}
						{#if summary.unattemptedCount > 0}
							<div
								class="bar-fill skipped"
								style="width: {pct(
									summary.unattemptedCount,
									questions.length,
								)}%"
							>
								<span>{summary.unattemptedCount} SKIPPED</span>
							</div>
						{/if}
					</div>
				</div>

				<a href="/student/tests" class="hero-retry-pill">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
						><path
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/></svg
					>
					Keep Trying
				</a>
			</section>

			<!-- ── Key Metrics ── -->
			<div class="km-grid">
				<div class="km-item blue">
					<div class="km-icon-box">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><circle cx="12" cy="12" r="10" /><polyline
								points="12 6 12 12 16 14"
							/></svg
						>
					</div>
					<span class="km-lbl">Total Time</span>
					<b class="km-val blue">{fmt(summary.totalTimeSpentMs)}</b>
				</div>
				<div class="km-item purple">
					<div class="km-icon-box">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><circle cx="12" cy="12" r="10" /><circle
								cx="12"
								cy="12"
								r="6"
							/><circle cx="12" cy="12" r="2" /></svg
						>
					</div>
					<span class="km-lbl">Accuracy</span>
					<b class="km-val purple">{summary.accuracy.toFixed(2)}%</b>
				</div>
				<div class="km-item green">
					<div class="km-icon-box">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path
								d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
							/><polyline points="14 2 14 8 20 8" /><line
								x1="16"
								y1="13"
								x2="8"
								y2="13"
							/><line x1="16" y1="17" x2="8" y2="17" /></svg
						>
					</div>
					<span class="km-lbl">Attempted</span>
					<b class="km-val green"
						>{summary.correctCount +
							summary.incorrectCount}/{questions.length}</b
					>
				</div>
				<div class="km-item red">
					<div class="km-icon-box">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path
								d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
							/><line x1="12" y1="9" x2="12" y2="13" /><line
								x1="12"
								y1="17"
								x2="12.01"
								y2="17"
							/></svg
						>
					</div>
					<span class="km-lbl">Negative</span>
					<b class="km-val red">-{negativeMarks.toFixed(2)}</b>
				</div>
			</div>

			<!-- ── Subject Performance Analysis ── -->
			{#if bySubject.length}
				<section class="section-card">
					<p class="section-label">Subject Performance</p>
					<div class="table-wrap">
						<table class="perf-table">
							<thead>
								<tr>
									<th>Subject</th>
									<th>Marks</th>
									<th>Correct</th>
									<th>Wrong</th>
									<th>Accuracy</th>
									<th>Time</th>
								</tr>
							</thead>
							<tbody>
								{#each bySubject as sub}
									<tr>
										<td>{subjectName(sub)}</td>
										<td
											>{sub.obtainedMarks}/{sub.totalMarks}</td
										>
										<td class="green">{sub.correctCount}</td
										>
										<td class="red">{sub.incorrectCount}</td
										>
										<td>{sub.accuracy.toFixed(2)}%</td>
										<td>{fmt(sub.timeSpentMs)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/if}

			<!-- ── Time Analysis ── -->
			<div class="time-cards-container">
				<p class="section-label">Time Breakdown</p>
				<div class="time-cards">
					<button
						type="button"
						class="time-card green"
						onclick={() => openPreview("correct")}
					>
						<div class="tc-icon-wrap green">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								><polyline points="20 6 9 17 4 12" /></svg
							>
						</div>
						<div>
							<b>Correct Average</b>
							<p class="green-txt">
								{fmt(
									summary.totalTimeSpentMs *
										(summary.correctCount /
											Math.max(questions.length, 1)),
								)}
							</p>
						</div>
					</button>
					<button
						type="button"
						class="time-card red"
						onclick={() => openPreview("incorrect")}
					>
						<div class="tc-icon-wrap red">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								><line x1="18" y1="6" x2="6" y2="18" /><line
									x1="6"
									y1="6"
									x2="18"
									y2="18"
								/></svg
							>
						</div>
						<div>
							<b>Wrong Average</b>
							<p class="red-txt">
								{fmt(
									summary.totalTimeSpentMs *
										(summary.incorrectCount /
											Math.max(questions.length, 1)),
								)}
							</p>
						</div>
					</button>
					<button
						type="button"
						class="time-card gray"
						onclick={() => openPreview("unattempted")}
					>
						<div class="tc-icon-wrap gray">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								><line x1="5" y1="12" x2="19" y2="12" /></svg
							>
						</div>
						<div>
							<b>Not Attempted</b>
							<p class="gray-txt">
								{summary.unattemptedCount} Questions
							</p>
						</div>
					</button>
				</div>
			</div>

			<!-- ── Advanced Analysis ── -->
			<section class="section-card">
				<AdvancedAnalysis
					{questions}
					{bySubject}
					{byChapter}
					{byChapterGroup}
					{byKind}
					{testName}
					{fmt}
				/>
			</section>

			<!-- ── Question Map ── -->
			<section class="section-card qmap-section">
				<p class="section-label">Question Map</p>
				<div class="qmap-grid">
					<div class="qmap-box green">
						<div class="qmap-box-header green">
							<span class="qmap-icon">✓</span>
							<b>Correct ({correctNums.length})</b>
						</div>
						<div class="qmap-nums">
							{#each correctNums as n}
								<button
									class="qnum green"
									onclick={() =>
										openPreview(
											"correct",
											correctNums.indexOf(n),
										)}>{n}</button
								>
							{/each}
						</div>
					</div>
					<div class="qmap-box red">
						<div class="qmap-box-header red">
							<span class="qmap-icon">✕</span>
							<b>Wrong ({incorrectNums.length})</b>
						</div>
						<div class="qmap-nums">
							{#each incorrectNums as n}
								<button
									class="qnum red"
									onclick={() =>
										openPreview(
											"incorrect",
											incorrectNums.indexOf(n),
										)}>{n}</button
								>
							{/each}
						</div>
					</div>
					<div class="qmap-box gray">
						<div class="qmap-box-header gray">
							<span class="qmap-icon">−</span>
							<b>Skipped ({unattemptedNums.length})</b>
						</div>
						<div class="qmap-nums">
							{#each unattemptedNums as n}
								<button
									class="qnum gray"
									onclick={() =>
										openPreview(
											"unattempted",
											unattemptedNums.indexOf(n),
										)}>{n}</button
								>
							{/each}
						</div>
					</div>
				</div>
				<div class="qmap-actions">
					<button
						class="qmap-global-btn"
						onclick={() => openPreview("all")}
					>
						View Full Question List →
					</button>
				</div>
			</section>
		</div>
		<!-- /ap-body -->
	</div>
	<!-- /ap -->

	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	<!-- QUESTION PREVIEW SIDEBAR                                                -->
	<!-- ═══════════════════════════════════════════════════════════════════════ -->
	{#if previewOpen}
		<button
			type="button"
			class="overlay"
			onclick={() => (previewOpen = false)}
			aria-label="Close preview"
		></button>
		<div class="preview-panel">
			<!-- nav bar -->
			<div class="preview-nav">
				<div class="preview-nav-top">
					<button
						class="preview-close"
						onclick={() => (previewOpen = false)}
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							><path
								d="M18 6L6 18M6 6l12 12"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
							/></svg
						>
						Questions Preview
					</button>
				</div>
				<div class="preview-nav-nums">
					{#each filteredQuestions as fq, i}
						<button
							class="pnav-num {previewIndex === i
								? 'active'
								: ''}"
							onclick={() => (previewIndex = i)}
							>{(fq.order ?? i) + 1}</button
						>
					{/each}
				</div>
			</div>

			{#if previewQuestion}
				{@const q = previewQuestion}
				{@const qNum = (q.order ?? previewIndex) + 1}
				{@const correctIds = q.correct?.identifiers ?? []}
				{@const selectedIds = q.answer?.identifiers ?? []}
				{@const opts =
					q.prompt?.en?.options ??
					q.prompt?.options ??
					q.options ??
					[]}
				<div class="preview-body">
					<!-- meta row -->
					<div class="preview-meta">
						<span class="pm-qnum">{qNum}</span>
						<div class="pm-times">
							<span>{fmt(q.timeSpentMs ?? 0)}</span>
							<span class="pm-sep">|</span>
							<span>+{q.marks ?? 0} / -{q.negMarks ?? 0}</span>
						</div>
						<span class="pm-badge">{q.questionKind ?? "MCQ"}</span>
						<div class="pm-status-icons">
							{#if q.isCorrect === true}
								<span class="pm-dot green" title="Correct"
									>●</span
								>
							{:else if q.isAttempted}
								<span class="pm-dot red" title="Wrong">●</span>
							{:else}
								<span class="pm-dot gray" title="Skipped"
									>●</span
								>
							{/if}
						</div>
					</div>

					<!-- question text -->
					<div class="preview-qtext math-content">
						<MathText
							content={q.prompt?.en?.content ??
								q.prompt?.content ??
								"Question not available"}
						/>
					</div>

					<!-- question images -->
					{#if q.prompt?.en?.images?.length}
						<div class="preview-images">
							{#each q.prompt.en.images as img}
								<img
									src={img.url ?? img}
									alt="Question figure"
									class="preview-img"
								/>
							{/each}
						</div>
					{/if}

					<!-- options — 2 column grid like screenshot -->
					{#if opts.length}
						<div class="preview-options-grid">
							{#each opts as opt}
								{@const isCorrect = correctIds.includes(
									opt.identifier,
								)}
								{@const isSelected = selectedIds.includes(
									opt.identifier,
								)}
								<div
									class="preview-opt"
									class:opt-correct={isCorrect}
									class:opt-wrong={isSelected && !isCorrect}
								>
									<span
										class="opt-circle"
										class:oc-green={isCorrect}
										class:oc-red={isSelected && !isCorrect}
										class:oc-blue={!isCorrect &&
											!isSelected}
									>
										{opt.identifier}
									</span>
									<span class="opt-text math-content">
										<MathText content={opt.content ?? ""} />
									</span>
									{#if isSelected && isCorrect}
										<span class="opt-tag ot-correct"
											>Your answer ✓</span
										>
									{:else if isCorrect}
										<span class="opt-tag ot-correct"
											>Correct answer</span
										>
									{:else if isSelected}
										<span class="opt-tag ot-wrong"
											>Your answer</span
										>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- prev / next -->
					<div class="preview-footer">
						<button
							class="pf-btn prev"
							disabled={previewIndex === 0}
							onclick={() => previewIndex--}>← Previous</button
						>
						<span class="pf-count"
							>{previewIndex + 1} / {filteredQuestions.length}</span
						>
						<button
							class="pf-btn next"
							disabled={previewIndex ===
								filteredQuestions.length - 1}
							onclick={() => previewIndex++}>Next →</button
						>
					</div>
				</div>
			{/if}
		</div>
	{/if}
{:else}
	<div class="ap-loading">Loading analysis…</div>
{/if}

<style>
	/* ── page shell ── */
	.ap {
		min-height: 100vh;
		background: var(--analysis-page-bg, #f1f5f9);
		font-family: "Inter", "Segoe UI", system-ui, sans-serif;
	}
	.ap-loading {
		padding: 4rem;
		text-align: center;
		color: #64748b;
		font-family: "Inter", sans-serif;
	}

	/* ── body ── */
	.ap-body {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* ── section card ── */
	.section-card {
		background: var(--analysis-card-bg, #fff);
		border: 1px solid var(--analysis-card-border, #e8edf5);
		border-radius: 14px;
		padding: 1.5rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
	}
	.section-label {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
		margin: 0 0 1rem;
	}

	/* ── header centered ── */
	.ap-header {
		background: var(--analysis-card-bg, #fff);
		color: var(--text-color, #1e293b);
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--analysis-card-border, #e2e8f0);
	}
	.ap-header-inner {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.header-center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.ap-title {
		color: var(--text-color, #1e293b);
		font-size: 1.1rem;
		font-weight: 800;
		margin: 0;
		letter-spacing: -0.01em;
	}
	.ap-sub {
		font-size: 0.72rem;
		color: #64748b;
		margin: 0.1rem 0 0;
		font-weight: 500;
		opacity: 0.8;
	}
	.back-btn {
		background: var(--analysis-page-bg, #f1f5f9);
		color: var(--text-color, #475569);
		border: none;
		border-radius: 8px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: 0.2s;
	}
	.back-btn:hover {
		background: var(--analysis-card-border, #e2e8f0);
	}
	.ap-badge {
		background: rgba(99, 102, 241, 0.1);
		border: none;
		color: #6366f1;
		border-radius: 30px;
		padding: 0.3rem 0.85rem;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ── hero section ── */
	.hero-stats {
		margin-bottom: 0.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}
	.hero-main-card {
		width: 100%;
		max-width: 1100px;
		display: grid;
		grid-template-columns: 1fr 1.2fr 1fr;
		gap: 1rem;
		align-items: center;
		background: linear-gradient(
			135deg,
			var(--analysis-card-bg, #fff) 0%,
			var(--analysis-page-bg, #f8fafc) 100%
		);
		border: 1px solid var(--analysis-card-border, #e2e8f0);
		padding: 1.5rem 2.5rem 2.5rem;
		border-radius: 28px;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.05);
		position: relative;
		overflow: hidden;
	}
	@media (max-width: 900px) {
		.hero-main-card {
			grid-template-columns: 1fr;
			text-align: center;
			gap: 2rem;
			padding: 1.5rem;
		}
	}

	.hero-main-card::before {
		content: "";
		position: absolute;
		top: -10%;
		left: -5%;
		width: 300px;
		height: 300px;
		background: radial-gradient(
			circle,
			rgba(16, 185, 129, 0.04) 0%,
			transparent 70%
		);
		z-index: 0;
	}

	/* score col */
	.hero-score-col {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		z-index: 1;
	}
	@media (max-width: 900px) {
		.hero-score-col {
			align-items: center;
		}
	}
	.hero-over-label {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #94a3b8;
		margin: 0 0 0.15rem;
	}
	.hero-score-val {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		margin-bottom: 0.6rem;
	}
	.hero-score-val .num {
		font-size: 3.5rem;
		font-weight: 900;
		color: var(--text-color, #1e293b);
		line-height: 1;
		letter-spacing: -0.05em;
	}
	.hero-score-val .slash {
		font-size: 1.5rem;
		color: #cbd5e1;
		font-weight: 300;
	}
	.hero-score-val .total {
		font-size: 1.5rem;
		color: #64748b;
		font-weight: 700;
	}
	.hero-accuracy-tag {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: rgba(16, 185, 129, 0.08);
		color: #10b981;
		padding: 0.4rem 0.85rem;
		border-radius: 30px;
		font-size: 0.75rem;
		font-weight: 800;
		border: 1px solid rgba(16, 185, 129, 0.12);
	}

	/* chart col */
	.hero-chart-col {
		display: flex;
		justify-content: center;
		z-index: 1;
	}
	.hero-chart-wrap {
		position: relative;
		width: 170px;
		height: 170px;
	}
	.hero-chart-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}
	.hero-chart-overlay b {
		font-size: 2rem;
		font-weight: 900;
		color: #10b981;
		letter-spacing: -0.02em;
	}
	.hero-chart-overlay span {
		font-size: 0.65rem;
		color: #94a3b8;
		font-weight: 800;
		text-transform: uppercase;
		margin-top: -2px;
		letter-spacing: 0.08em;
	}

	/* breakdown col */
	.hero-breakdown-col {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 1;
		min-width: 160px;
	}
	@media (max-width: 900px) {
		.hero-breakdown-col {
			flex-direction: row;
			justify-content: center;
			gap: 1rem;
		}
	}
	.hb-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: var(--analysis-card-bg, #fff);
		padding: 0.6rem 1rem;
		border-radius: 12px;
		border: 1px solid var(--analysis-card-border, #f1f5f9);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
	}
	.hb-top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.hb-icon-small {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 900;
		border: 1px solid currentColor;
	}
	.hb-item.green .hb-icon-small {
		color: #10b981;
	}
	.hb-item.red .hb-icon-small {
		color: #ef4444;
	}
	.hb-item.gray .hb-icon-small {
		color: #64748b;
	}
	.hb-num {
		font-size: 1.15rem;
		font-weight: 900;
		color: var(--text-color, #1e293b);
	}
	.hb-lbl {
		font-size: 0.6rem;
		font-weight: 800;
		color: #94a3b8;
		letter-spacing: 0.05em;
		margin-left: 1.85rem;
	}

	/* segment bar */
	.hero-bottom-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 22px;
		display: flex;
	}
	.bar-fill {
		height: 100%;
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: 800;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		overflow: hidden;
		white-space: nowrap;
		transition: all 0.3s ease;
	}
	.bar-fill span {
		padding: 0 0.5rem;
	}
	.bar-fill.correct {
		background: #10b981;
	}
	.bar-fill.wrong {
		background: #ef4444;
	}
	.bar-fill.skipped {
		background: #94a3b8;
		color: #1e293b;
	}

	.hero-retry-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		color: #fff;
		padding: 0.65rem 1.75rem;
		border-radius: 40px;
		font-size: 0.8rem;
		font-weight: 800;
		text-decoration: none;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		margin-top: -0.5rem;
		box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
		position: relative;
		z-index: 2;
		cursor: pointer;
	}
	.hero-retry-pill:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
		opacity: 0.95;
	}
	.hero-retry-pill svg {
		stroke-width: 2.5;
	}

	.hero-retry-pill svg {
		stroke-width: 2.5;
	}

	/* key metrics */
	.km-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.25rem;
	}
	@media (max-width: 640px) {
		.km-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.km-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem;
		border-radius: 24px;
		border: 1px solid var(--analysis-card-border, #f1f5f9);
		background: var(--analysis-card-bg, #fff);
		text-align: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
		transition: all 0.2s;
	}
	.km-item:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
	}
	.km-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.25rem;
	}
	.km-item.blue .km-icon-box {
		background: #eff6ff;
		color: #3b82f6;
	}
	.km-item.purple .km-icon-box {
		background: #f5f3ff;
		color: #8b5cf6;
	}
	.km-item.green .km-icon-box {
		background: #f0fdf4;
		color: #10b981;
	}
	.km-item.red .km-icon-box {
		background: #fff1f2;
		color: #ef4444;
	}

	.km-lbl {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #94a3b8;
	}
	.km-val {
		font-size: 1.35rem;
		font-weight: 900;
		letter-spacing: -0.02em;
	}
	.km-val.blue {
		color: #1e40af;
	}
	.km-val.purple {
		color: #5b21b6;
	}
	.km-val.green {
		color: #166534;
	}
	.km-val.red {
		color: #991b1b;
	}
	:global([data-theme="dark"]) .km-val.blue {
		color: #60a5fa;
	}
	:global([data-theme="dark"]) .km-val.purple {
		color: #a78bfa;
	}
	:global([data-theme="dark"]) .km-val.green {
		color: #4ade80;
	}
	:global([data-theme="dark"]) .km-val.red {
		color: #f87171;
	}

	/* ── table ── */
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--analysis-card-border, #e8edf5);
		border-radius: 8px;
	}
	.perf-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.perf-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		color: #64748b;
		font-weight: 600;
		border-bottom: 1px solid var(--analysis-card-border, #e8edf5);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.perf-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--analysis-card-border, #f1f5f9);
		color: var(--text-color, #334155);
		font-weight: 500;
	}
	.perf-table td.green {
		color: #10b981;
		font-weight: 700;
	}
	.perf-table td.red {
		color: #ef4444;
		font-weight: 700;
	}
	.perf-table tbody tr:hover {
		background: var(--analysis-page-bg, #f8fafc);
	}
	.perf-table tbody tr:last-child td {
		border-bottom: none;
	}

	/* ── time cards ── */
	.time-cards {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-top: 1rem;
	}
	@media (max-width: 640px) {
		.time-cards {
			grid-template-columns: 1fr;
		}
	}
	.time-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.85rem 1rem;
		border-radius: 16px;
		cursor: pointer;
		border: none;
		text-align: left;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
	}
	.time-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.time-card.green {
		background: #f0fdf4;
		border: 1.5px solid #dcfce7;
	}
	.time-card.red {
		background: #fff1f2;
		border: 1.5px solid #fee2e2;
	}
	.time-card.gray {
		background: #f8fafc;
		border: 1.5px solid #f1f5f9;
	}
	:global([data-theme="dark"]) .time-card.green {
		background: rgba(34, 197, 94, 0.08);
		border-color: rgba(34, 197, 94, 0.2);
	}
	:global([data-theme="dark"]) .time-card.red {
		background: rgba(239, 68, 68, 0.08);
		border-color: rgba(239, 68, 68, 0.2);
	}
	:global([data-theme="dark"]) .time-card.gray {
		background: var(--analysis-card-bg, #1e293b);
		border-color: var(--analysis-card-border, #334155);
	}
	.time-card b {
		font-size: 0.8rem;
		color: var(--text-color, #1e293b);
		font-weight: 800;
		display: block;
		margin-bottom: 0.1rem;
	}
	.time-card p {
		font-size: 0.7rem;
		color: #64748b;
		margin: 0;
		font-weight: 500;
	}
	.tc-icon-wrap {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.tc-icon-wrap.green {
		background: #22c55e;
		color: #fff;
	}
	.tc-icon-wrap.red {
		background: #ef4444;
		color: #fff;
	}
	.tc-icon-wrap.gray {
		background: #94a3b8;
		color: #fff;
	}

	/* ── advanced analysis — now in AdvancedAnalysis.svelte component ── */

	/* ── question map ── */
	.qmap-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}
	@media (max-width: 768px) {
		.qmap-grid {
			grid-template-columns: 1fr;
		}
	}
	.qmap-box {
		border-radius: 16px;
		overflow: hidden;
		background: var(--analysis-page-bg, #f8fafc);
		border: 1px solid var(--analysis-card-border, transparent);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
	}
	.qmap-box-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		font-size: 0.75rem;
		font-weight: 800;
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.qmap-box-header.green {
		background: #16a34a;
	}
	.qmap-box-header.red {
		background: #dc2626;
	}
	.qmap-box-header.gray {
		background: #475569;
	}
	.qmap-icon {
		font-size: 0.85rem;
		opacity: 0.9;
	}
	.qmap-nums {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 1rem;
		min-height: 80px;
		align-content: flex-start;
	}
	.qmap-box.green .qmap-nums {
		background: rgba(34, 197, 94, 0.04);
	}
	.qmap-box.red .qmap-nums {
		background: rgba(239, 68, 68, 0.04);
	}
	.qnum {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		border: 1px solid transparent;
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.qnum.green {
		background: rgba(34, 197, 94, 0.12);
		color: #16a34a;
	}
	.qnum.red {
		background: rgba(239, 68, 68, 0.12);
		color: #dc2626;
	}
	.qnum.gray {
		background: var(--analysis-card-border, #e2e8f0);
		color: var(--text-color, #475569);
	}
	.qnum:hover {
		transform: scale(1.1);
		filter: brightness(0.9);
	}
	.qmap-actions {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}
	.qmap-global-btn {
		background: #6366f1;
		color: #fff;
		border: none;
		border-radius: 30px;
		padding: 0.6rem 1.75rem;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		transition: 0.2s;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
	}
	.qmap-global-btn:hover {
		background: #4f46e5;
		transform: translateY(-1px);
	}

	/* ── preview overlay ── */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 300;
		cursor: pointer;
	}
	.preview-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(700px, 100vw);
		background: #fff;
		z-index: 301;
		display: flex;
		flex-direction: column;
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}
	:global([data-theme="dark"]) .preview-panel {
		background: #1e293b;
	}

	/* preview nav */
	.preview-nav {
		background: #1e3a8a;
		color: #fff;
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	.preview-nav-top {
		display: flex;
		align-items: center;
	}
	.preview-close {
		background: none;
		border: none;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		text-align: left;
		padding: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.preview-nav-nums {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		max-height: 90px;
		overflow-y: auto;
		padding-top: 0.25rem;
	}
	.pnav-num {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.pnav-num.active {
		background: #fff;
		color: #1e3a8a;
	}
	.pnav-num:hover:not(.active) {
		background: rgba(255, 255, 255, 0.2);
	}

	/* preview body */
	.preview-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* meta row */
	.preview-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.pm-qnum {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #ef4444;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.pm-times {
		font-size: 0.75rem;
		color: #64748b;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.pm-sep {
		opacity: 0.4;
	}
	.pm-badge {
		background: #eff6ff;
		color: #3b82f6;
		border-radius: 4px;
		padding: 0.2rem 0.6rem;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.pm-status-icons {
		margin-left: auto;
		display: flex;
		gap: 0.4rem;
	}
	.pm-dot {
		font-size: 1.25rem;
		line-height: 1;
	}
	.pm-dot.green {
		color: #22c55e;
	}
	.pm-dot.red {
		color: #ef4444;
	}
	.pm-dot.gray {
		color: #94a3b8;
	}

	/* question text */
	.preview-qtext {
		font-size: 0.9375rem;
		color: #1e293b;
		line-height: 1.7;
		padding: 1rem 1.25rem;
		background: #f8fafc;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}
	:global([data-theme="dark"]) .preview-qtext {
		background: #0f172a;
		color: #e2e8f0;
		border-color: #334155;
	}
	.math-content :global(mjx-container) {
		display: inline !important;
	}
	.math-content :global(.MathJax) {
		display: inline !important;
	}

	/* images */
	.preview-images {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.preview-img {
		max-width: 100%;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
	}

	/* options 2-col grid */
	.preview-options-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	@media (max-width: 480px) {
		.preview-options-grid {
			grid-template-columns: 1fr;
		}
	}

	.preview-opt {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem 1.75rem;
		border-radius: 10px;
		border: 1.5px solid #e2e8f0;
		background: #f8fafc;
		font-size: 0.875rem;
		color: #1e293b;
		position: relative;
		min-height: 56px;
	}
	:global([data-theme="dark"]) .preview-opt {
		background: #1e293b;
		border-color: #334155;
		color: #e2e8f0;
	}
	/* correct answer — faint green, dark text */
	.preview-opt.opt-correct {
		background: #f0fdf4;
		border-color: #86efac;
		color: #14532d;
	}
	/* wrong selected — faint red, dark text */
	.preview-opt.opt-wrong {
		background: #fff1f2;
		border-color: #fca5a5;
		color: #7f1d1d;
	}

	.opt-circle {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.opt-circle.oc-blue {
		background: #e0e7ff;
		color: #3730a3;
	}
	:global([data-theme="dark"]) .opt-circle.oc-blue {
		background: #3730a3;
		color: #e0e7ff;
	}
	.opt-circle.oc-green {
		background: #16a34a;
		color: #fff;
	}
	.opt-circle.oc-red {
		background: #dc2626;
		color: #fff;
	}

	.opt-text {
		flex: 1;
		line-height: 1.5;
		word-break: break-word;
	}
	.opt-tag {
		position: absolute;
		bottom: 5px;
		right: 8px;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
	}
	.ot-correct {
		background: #16a34a;
		color: #fff;
	}
	.ot-wrong {
		background: #dc2626;
		color: #fff;
	}

	/* footer */
	.preview-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 0 0;
		border-top: 1px solid #e2e8f0;
		margin-top: auto;
	}
	:global([data-theme="dark"]) .preview-footer {
		border-color: #334155;
	}
	.pf-count {
		font-size: 0.8rem;
		color: #64748b;
	}
	.pf-btn {
		padding: 0.6rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}
	.pf-btn.prev {
		background: #f1f5f9;
		color: #475569;
	}
	.pf-btn.next {
		background: #22c55e;
		color: #fff;
	}
	.pf-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
</style>
