<script lang="ts">
	import { onMount } from "svelte";
	import type { PageData } from "./$types";
	import { Chart, registerables } from "chart.js";
	import { goto } from "$app/navigation";

	Chart.register(...registerables);

	let { data } = $props<{ data: PageData }>();
	const summary = $derived(data.summary);
	const testName = $derived(data.testName || "Detailed Analysis");

	let activeTab = $state("overall");
	let donutChart: Chart | null = null;
	let barChart: Chart | null = null;

	let donutCanvas = $state<HTMLCanvasElement | null>(null);
	let barCanvas = $state<HTMLCanvasElement | null>(null);

	const subjects = $derived(summary?.statsBreakdown?.bySubject ?? []);

	const currentStats = $derived.by(() => {
		if (!summary) return null;
		if (activeTab === "overall") {
			return {
				marks: summary.obtainedMarks,
				totalMarks: summary.totalMarks,
				attempted: summary.correctCount + summary.incorrectCount,
				totalQs:
					summary.correctCount +
					summary.incorrectCount +
					summary.unattemptedCount,
				accuracy: summary.accuracy,
				timeSpentMs: summary.totalTimeSpentMs,
				correct: summary.correctCount,
				incorrect: summary.incorrectCount,
				unattempted: summary.unattemptedCount,
			};
		}
		const sub = subjects.find(
			(s: any) => (s.subjectId?._id || s.subjectId) === activeTab,
		);
		if (!sub) return null;
		return {
			marks: sub.obtainedMarks,
			totalMarks: sub.totalMarks,
			attempted: sub.attemptedCount,
			totalQs: sub.totalQuestions,
			accuracy: sub.accuracy,
			timeSpentMs: sub.timeSpentMs,
			correct: sub.correctCount,
			incorrect: sub.incorrectCount,
			unattempted: sub.totalQuestions - sub.attemptedCount,
		};
	});

	function formatTime(ms: number) {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		if (minutes === 0) return `${seconds}s`;
		return `${minutes}m ${seconds}s`;
	}

	function updateCharts() {
		if (!currentStats) return;

		const isDark =
			typeof document !== "undefined" &&
			document.documentElement.getAttribute("data-theme") === "dark";
		const textColor = isDark ? "#A1A1AA" : "#64748b";
		const gridColor = isDark
			? "rgba(255,255,255,0.05)"
			: "rgba(0,0,0,0.05)";

		// Donut Chart
		if (donutCanvas) {
			if (donutChart) donutChart.destroy();
			donutChart = new Chart(donutCanvas, {
				type: "doughnut",
				data: {
					labels: ["Correct", "Incorrect", "Not Answered"],
					datasets: [
						{
							data: [
								currentStats.correct,
								currentStats.incorrect,
								currentStats.unattempted,
							],
							backgroundColor: [
								"#22c55e",
								"#ef4444",
								isDark ? "#3f3f46" : "#e2e8f0",
							],
							borderWidth: 0,
						},
					],
				},
				options: {
					cutout: "75%",
					plugins: { legend: { display: false } },
					responsive: true,
					maintainAspectRatio: false,
				},
			});
		}

		// Bar Chart
		if (barCanvas) {
			if (barChart) barChart.destroy();
			barChart = new Chart(barCanvas, {
				type: "bar",
				data: {
					labels: ["Correct", "Incorrect", "Unanswered"],
					datasets: [
						{
							label: "Time spent",
							data: [
								currentStats.correct > 0
									? (currentStats.timeSpentMs / 1000) * 0.6
									: 0,
								currentStats.incorrect > 0
									? (currentStats.timeSpentMs / 1000) * 0.3
									: 0,
								currentStats.unattempted > 0
									? (currentStats.timeSpentMs / 1000) * 0.1
									: 0,
							],
							backgroundColor: [
								"#22c55e",
								"#ef4444",
								isDark ? "#3f3f46" : "#e2e8f0",
							],
							borderRadius: 4,
							barThickness: 24,
						},
					],
				},
				options: {
					plugins: { legend: { display: false } },
					scales: {
						y: {
							beginAtZero: true,
							grid: { color: gridColor },
							ticks: { color: textColor, font: { size: 10 } },
						},
						x: {
							grid: { display: false },
							ticks: { color: textColor, font: { size: 10 } },
						},
					},
					responsive: true,
					maintainAspectRatio: false,
				},
			});
		}
	}

	onMount(() => {
		updateCharts();
		const observer = new MutationObserver(() => updateCharts());
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	});

	$effect(() => {
		if (activeTab) updateCharts();
	});
</script>

<svelte:head>
	<title>Analysis — {testName}</title>
</svelte:head>

<div class="analysis-page">
	<div class="mx-auto max-w-7xl">
		<!-- Header / Simple Nav -->
		<header class="flex items-center justify-between mb-10">
			<div class="flex items-center gap-6">
				<button
					type="button"
					onclick={() => history.back()}
					class="back-btn"
					aria-label="Back"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
						<path
							d="M15 18L9 12L15 6"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
				<div>
					<h1 class="text-3xl font-extrabold header-title">
						Report Card
					</h1>
					<p class="text-sm header-sub">{testName}</p>
				</div>
			</div>

			<!-- <div class="flex gap-2">
				<button class="action-btn">View Questions</button>
				<button class="action-btn">Reattempt</button>
			</div> -->
		</header>

		<main class="analysis-card">
			<!-- Simple Tabs -->
			<div class="tabs-container">
				<button
					onclick={() => (activeTab = "overall")}
					class="tab-item {activeTab === 'overall' ? 'active' : ''}"
				>
					Overall
				</button>
				{#each subjects as sub}
					{@const sid = sub.subjectId?._id || sub.subjectId}
					{#if sid}
						<button
							onclick={() => (activeTab = sid)}
							class="tab-item {activeTab === sid ? 'active' : ''}"
						>
							{sub.subjectId?.name?.en ?? "Subject"}
						</button>
					{/if}
				{/each}
			</div>

			{#if currentStats}
				<!-- Grid of Metrics -->
				<div class="metrics-grid">
					<div class="metric-card blue">
						<p class="metric-label">Marks</p>
						<div class="metric-value">
							<span class="main">{currentStats.marks}</span>
							<span class="sub">/{currentStats.totalMarks}</span>
						</div>
						<div class="metric-progress-bg">
							<div
								class="metric-progress-bar"
								style="width: {(currentStats.marks /
									currentStats.totalMarks) *
									100}%"
							></div>
						</div>
					</div>

					<div class="metric-card">
						<p class="metric-label">Attempted</p>
						<div class="metric-value">
							<span class="main">{currentStats.attempted}</span>
						</div>
						<p class="metric-footer">
							out of {currentStats.totalQs} Qs
						</p>
					</div>

					<div class="metric-card green">
						<p class="metric-label">Accuracy</p>
						<div class="metric-value">
							<span class="main"
								>{currentStats.accuracy.toFixed(1)}%</span
							>
						</div>
						<p class="metric-footer">Correct performance</p>
					</div>

					<div class="metric-card orange">
						<p class="metric-label">Time Taken</p>
						<div class="metric-value">
							<span class="main"
								>{formatTime(currentStats.timeSpentMs)}</span
							>
						</div>
						<p class="metric-footer">on this attempt</p>
					</div>
				</div>

				<!-- Charts Row -->
				<div class="charts-row">
					<div class="chart-box">
						<h3 class="chart-title">Attempt Analysis</h3>
						<div class="chart-content">
							<div class="chart-canvas-wrapper flex-shrink-0">
								<canvas bind:this={donutCanvas}></canvas>
								<div class="chart-center-text">
									<span class="text-2xl font-bold"
										>{currentStats.totalQs}</span
									>
									<span
										class="text-[10px] uppercase font-semibold opacity-50"
										>Total</span
									>
								</div>
							</div>
							<div class="chart-legend">
								<div class="legend-item">
									<span class="dot correct"></span> Correct
									<b>{currentStats.correct}</b>
								</div>
								<div class="legend-item">
									<span class="dot incorrect"></span> Wrong
									<b>{currentStats.incorrect}</b>
								</div>
								<div class="legend-item">
									<span class="dot unanswered"></span>
									Unanswered <b>{currentStats.unattempted}</b>
								</div>
							</div>
						</div>
					</div>

					<div class="chart-box">
						<h3 class="chart-title">Quality of Time Spent</h3>
						<p class="text-[12px] opacity-60 mb-4">
							Trend based on correctness
						</p>
						<div class="h-60 w-full">
							<canvas bind:this={barCanvas}></canvas>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.analysis-page {
		min-height: 100vh;
		background: var(--analysis-page-bg);
		padding: 2rem 1.5rem;
		transition: background 0.3s ease;
	}

	.header-title {
		color: var(--analysis-text-primary);
	}
	.header-sub {
		color: var(--analysis-text-secondary);
		opacity: 0.8;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--analysis-card-bg);
		border: 1px solid var(--analysis-card-border);
		color: var(--analysis-text-primary);
		transition: all 0.2s;
	}
	.back-btn:hover {
		background: var(--analysis-card-border);
	}

	.action-btn {
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-weight: 700;
		border-radius: 8px;
		background: var(--analysis-card-bg);
		border: 1px solid var(--analysis-card-border);
		color: var(--analysis-text-primary);
		transition: all 0.2s;
	}
	.action-btn:hover {
		background: var(--analysis-card-border);
	}

	.analysis-card {
		background: var(--analysis-card-bg);
		border: 1px solid var(--analysis-card-border);
		border-radius: 32px;
		padding: 2.5rem;
		box-shadow: var(--analysis-card-shadow);
	}

	.tabs-container {
		display: flex;
		gap: 2rem;
		border-bottom: 1px solid var(--analysis-card-border);
		margin-bottom: 3rem;
		padding-bottom: 4px;
	}
	.tab-item {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--analysis-tab-inactive);
		padding-bottom: 0.5rem;
		transition: all 0.2s;
		position: relative;
	}
	.tab-item.active {
		color: var(--analysis-tab-active);
	}
	.tab-item.active::after {
		content: "";
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--analysis-tab-active);
		border-radius: 2px;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		gap: 1rem;
		margin-bottom: 2.5rem;
	}
	@media (min-width: 640px) {
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.metrics-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.metric-card {
		padding: 2rem;
		border-radius: 20px;
		border: 1px solid var(--analysis-card-border);
		background: var(--analysis-card-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		transition: transform 0.2s;
	}
	.metric-card:hover {
		transform: translateY(-3px);
	}

	.metric-label {
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		color: var(--analysis-text-secondary);
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}
	.metric-value .main {
		font-size: 2.25rem;
		font-weight: 800;
		color: var(--analysis-text-primary);
	}
	.metric-value .sub {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--analysis-text-secondary);
		opacity: 0.6;
	}
	.metric-footer {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--analysis-text-secondary);
		opacity: 0.7;
		margin-top: 0.5rem;
	}

	.metric-card.blue {
		background: var(--analysis-metric-blue-bg);
		border-color: var(--analysis-metric-blue-border);
	}
	.metric-card.blue .main {
		color: var(--analysis-metric-blue-text);
	}
	.metric-card.blue .metric-label {
		color: var(--analysis-metric-blue-text);
		opacity: 0.7;
	}

	.metric-card.green .main {
		color: var(--analysis-metric-green-text);
	}
	.metric-card.orange .main {
		color: var(--analysis-metric-orange-text);
	}

	.metric-progress-bg {
		width: 100%;
		height: 4px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 2px;
		margin-top: 1rem;
		overflow: hidden;
	}
	:global([data-theme="dark"]) .metric-progress-bg {
		background: rgba(255, 255, 255, 0.05);
	}
	.metric-progress-bar {
		height: 100%;
		background: currentColor;
		border-radius: 2px;
		opacity: 0.3;
	}

	.charts-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}
	@media (min-width: 1024px) {
		.charts-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	.chart-box {
		padding: 2.5rem;
		border-radius: 24px;
		border: 1px solid var(--analysis-card-border);
		background: var(--analysis-card-bg);
	}
	.chart-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--analysis-text-primary);
		margin-bottom: 2rem;
	}

	.chart-content {
		display: flex;
		align-items: center;
		gap: 3rem;
	}
	.chart-canvas-wrapper {
		position: relative;
		width: 180px;
		height: 180px;
	}
	.chart-center-text {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--analysis-text-primary);
		pointer-events: none;
	}

	.chart-legend {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--analysis-text-secondary);
	}
	.legend-item b {
		color: var(--analysis-text-primary);
		margin-left: auto;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.dot.correct {
		background: #22c55e;
	}
	.dot.incorrect {
		background: #ef4444;
	}
	.dot.unanswered {
		background: #94a3b8;
	}
	:global([data-theme="dark"]) .dot.unanswered {
		background: #3f3f46;
	}
</style>
