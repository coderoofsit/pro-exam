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
								aria-label="{summary.correctCount} correct"
							>
								<span class="bar-lbl-full"
									>{summary.correctCount} CORRECT</span
								>
								<span class="bar-lbl-compact" aria-hidden="true"
									>✓ {summary.correctCount}</span
								>
							</div>
						{/if}
						{#if summary.incorrectCount > 0}
							<div
								class="bar-fill wrong"
								style="width: {pct(
									summary.incorrectCount,
									questions.length,
								)}%"
								aria-label="{summary.incorrectCount} wrong"
							>
								<span class="bar-lbl-full"
									>{summary.incorrectCount} WRONG</span
								>
								<span class="bar-lbl-compact" aria-hidden="true"
									>✕ {summary.incorrectCount}</span
								>
							</div>
						{/if}
						{#if summary.unattemptedCount > 0}
							<div
								class="bar-fill skipped"
								style="width: {pct(
									summary.unattemptedCount,
									questions.length,
								)}%"
								aria-label="{summary.unattemptedCount} skipped"
							>
								<span class="bar-lbl-full"
									>{summary.unattemptedCount} SKIPPED</span
								>
								<span class="bar-lbl-compact" aria-hidden="true"
									>− {summary.unattemptedCount}</span
								>
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
				{@const promptEn =
					q.prompt?.en ??
					q.question?.prompt?.en ??
					q.prompt ??
					{}}
				{@const opts = promptEn?.options ?? q.options ?? []}
				{@const questionImages = promptEn?.images ?? []}
				{@const explanationText =
					promptEn?.explanation ??
					q.question?.prompt?.en?.explanation ??
					""}
				{@const explanationImages =
					promptEn?.explanationImages ??
					q.question?.prompt?.en?.explanationImages ??
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
								<span class="pm-answer-label pm-answer-correct"
									>Correct Answer</span
								>
							{:else if q.isAttempted}
								<span class="pm-answer-label pm-answer-wrong"
									>Wrong</span
								>
							{:else}
								<span class="pm-answer-label pm-answer-skip"
									>Not attempted</span
								>
							{/if}
						</div>
					</div>

					<!-- question text -->
					<div class="preview-qtext math-content">
						<MathText
							content={promptEn?.content ??
								q.prompt?.content ??
								"Question not available"}
						/>
						{#if q.chapterSlug}
							<div class="mt-1 text-sm font-semibold text-white">
								Chapter: {String(q.chapterSlug)}
							</div>
						{/if}
					</div>

					<!-- question images -->
					{#if questionImages?.length}
						<div class="preview-images">
							{#each questionImages as img}
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
										{#if opt.images?.length}
											<div class="preview-option-images">
												{#each opt.images as optImg}
													<img
														src={optImg.url ?? optImg}
														alt={`Option ${opt.identifier} image`}
														class="preview-option-img"
													/>
												{/each}
											</div>
										{/if}
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

					{#if explanationText || explanationImages?.length}
						<div class="preview-explanation">
							<div class="preview-explanation-title">
								Exam Flow Solution
							</div>
							{#if explanationText}
								<div class="preview-explanation-text math-content">
									<MathText content={explanationText} />
								</div>
							{/if}
							{#if explanationImages?.length}
								<div class="preview-explanation-images">
									{#each explanationImages as exImg}
										<img
											src={exImg.url ?? exImg}
											alt="Explanation figure"
											class="preview-explanation-img"
										/>
									{/each}
								</div>
							{/if}
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

