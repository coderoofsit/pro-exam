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
	const byChapterGroup = $derived<any[]>(summary?.statsBreakdown?.byChapterGroup ?? []);
	const byKind = $derived<any[]>(summary?.statsBreakdown?.byKind ?? []);

	// ── question preview sidebar ─────────────────────────────────────────────
	let previewOpen = $state(false);
	let previewFilter = $state<"all" | "correct" | "incorrect" | "unattempted">("all");
	let previewIndex = $state(0);

	const filteredQuestions = $derived.by(() => {
		if (previewFilter === "correct") return questions.filter((q) => q.isCorrect === true);
		if (previewFilter === "incorrect") return questions.filter((q) => q.isAttempted && q.isCorrect === false);
		if (previewFilter === "unattempted") return questions.filter((q) => !q.isAttempted);
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
		const isDark = document.documentElement.getAttribute("data-theme") === "dark";
		donutChart = new Chart(donutCanvas, {
			type: "doughnut",
			data: {
				labels: ["Correct", "Wrong", "Skipped"],
				datasets: [{
					data: [summary.correctCount, summary.incorrectCount, summary.unattemptedCount],
					backgroundColor: ["#22c55e", "#ef4444", isDark ? "#3f3f46" : "#d1d5db"],
					borderWidth: 0,
				}],
			},
			options: {
				cutout: "72%",
				plugins: { legend: { display: false } },
				responsive: true,
				maintainAspectRatio: false,
			},
		});
	}

	onMount(() => {
		buildDonut();
		const obs = new MutationObserver(buildDonut);
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
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
	const correctNums = $derived(questions.map((q, i) => q.isCorrect === true ? i + 1 : null).filter(Boolean) as number[]);
	const incorrectNums = $derived(questions.map((q, i) => (q.isAttempted && q.isCorrect === false) ? i + 1 : null).filter(Boolean) as number[]);
	const unattemptedNums = $derived(questions.map((q, i) => !q.isAttempted ? i + 1 : null).filter(Boolean) as number[]);

	const negativeMarks = $derived(
		questions.reduce((acc, q) => acc + (q.isAttempted && q.isCorrect === false ? (q.negMarks ?? 0) : 0), 0)
	);
</script>

<svelte:head>
	<title>Analysis — {testName}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

{#if summary}
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- MAIN PAGE                                                               -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<div class="ap">
	<!-- ── Header ── -->
	<div class="ap-header">
		<div class="ap-header-inner">
			<button type="button" onclick={() => history.back()} class="back-btn" aria-label="Back">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</button>
			<div>
				<h1 class="ap-title">{testName}</h1>
				<p class="ap-sub">Submitted · {summary.questionCount ?? questions.length} Questions · {summary.testSnapshot?.durationMinutes ?? "—"} min</p>
			</div>
			<span class="ap-badge">{summary.testSnapshot?.kind ?? "Test"}</span>
		</div>
	</div>

	<div class="ap-body">

		<!-- ── Performance Overview ── -->
		<section class="section-card perf-grid">
			<!-- Score box -->
			<div class="score-box">
				<p class="score-label">Your Score</p>
				<p class="score-val" class:neg={summary.obtainedMarks < 0}>{summary.obtainedMarks}</p>
				<p class="score-total">out of <span>{summary.totalMarks}</span></p>
				<div class="score-ring-wrap">
					<canvas bind:this={donutCanvas} width="80" height="80"></canvas>
					<div class="score-ring-pct">{pct(summary.obtainedMarks < 0 ? 0 : summary.obtainedMarks, summary.totalMarks)}%</div>
				</div>
				<p class="score-sub-label">Total Score</p>
				<a href="/student/tests" class="keep-trying-btn">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					Keep Trying
				</a>
			</div>

			<!-- Performance overview -->
			<div class="perf-overview">
				<p class="section-label">Performance Overview</p>
				<div class="perf-circles">
					<div class="perf-circle green">
						<span class="pc-icon">✓</span>
						<b>{summary.correctCount}</b>
						<span>Correct</span>
					</div>
					<div class="perf-circle red">
						<span class="pc-icon">✕</span>
						<b>{summary.incorrectCount}</b>
						<span>Wrong</span>
					</div>
					<div class="perf-circle gray">
						<span class="pc-icon">−</span>
						<b>{summary.unattemptedCount}</b>
						<span>Skipped</span>
					</div>
				</div>
				<div class="perf-bars">
					<div class="pb-row">
						<span class="pb-dot green"></span>
						<span class="pb-label">Correct</span>
						<div class="pb-track"><div class="pb-fill green" style="width:{pct(summary.correctCount, questions.length)}%"></div></div>
						<span class="pb-pct">{pct(summary.correctCount, questions.length)}%</span>
					</div>
					<div class="pb-row">
						<span class="pb-dot red"></span>
						<span class="pb-label">Wrong</span>
						<div class="pb-track"><div class="pb-fill red" style="width:{pct(summary.incorrectCount, questions.length)}%"></div></div>
						<span class="pb-pct">{pct(summary.incorrectCount, questions.length)}%</span>
					</div>
					<div class="pb-row">
						<span class="pb-dot gray"></span>
						<span class="pb-label">Not Attempted</span>
						<div class="pb-track"><div class="pb-fill gray" style="width:{pct(summary.unattemptedCount, questions.length)}%"></div></div>
						<span class="pb-pct">{pct(summary.unattemptedCount, questions.length)}%</span>
					</div>
				</div>
			</div>
		</section>

		<!-- ── Key Metrics ── -->
		<section class="section-card">
			<p class="section-label">Key Metrics</p>
			<div class="km-grid">
				<div class="km-item blue">
					<span class="km-icon">⏱</span>
					<span class="km-lbl">Time</span>
					<b class="km-val blue">{fmt(summary.totalTimeSpentMs)}</b>
				</div>
				<div class="km-item green">
					<span class="km-icon">🎯</span>
					<span class="km-lbl">Accuracy</span>
					<b class="km-val green">{summary.accuracy.toFixed(2)}%</b>
				</div>
				<div class="km-item purple">
					<span class="km-icon">📝</span>
					<span class="km-lbl">Attempted</span>
					<b class="km-val purple">{summary.correctCount + summary.incorrectCount}/{questions.length}</b>
				</div>
				<div class="km-item red">
					<span class="km-icon">⚠</span>
					<span class="km-lbl">Negative</span>
					<b class="km-val red">-{negativeMarks.toFixed(2)}</b>
				</div>
			</div>
		</section>

		<!-- ── View All / Question Map buttons ── -->
		<div class="qmap-btns">
			<button class="qmap-btn blue" onclick={() => openPreview("all")}>
				<span>📋 View All Questions</span>
				<span>→</span>
			</button>
		</div>

		<!-- ── Subject Performance Analysis ── -->
		{#if bySubject.length}
		<section class="section-card">
			<p class="section-label">Subject Performance Analysis</p>
			<div class="table-header-bar">
				<span>📊 Subject-wise Performance</span>
			</div>
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
							<td>{sub.obtainedMarks}/{sub.totalMarks}</td>
							<td class="green">{sub.correctCount}</td>
							<td class="red">{sub.incorrectCount}</td>
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
		<section class="section-card">
			<p class="section-label">Time Analysis</p>
			<div class="table-header-bar"><span>⏱ Time Management Analysis</span></div>
			<div class="time-cards">
				<div class="time-card green" onclick={() => openPreview("correct")} role="button" tabindex="0">
					<span class="tc-icon green">✓</span>
					<div>
						<b>Correct Questions</b>
						<p>{fmt(summary.totalTimeSpentMs * (summary.correctCount / Math.max(questions.length, 1)))} avg</p>
					</div>
				</div>
				<div class="time-card red" onclick={() => openPreview("incorrect")} role="button" tabindex="0">
					<span class="tc-icon red">✕</span>
					<div>
						<b>Wrong Questions</b>
						<p>{fmt(summary.totalTimeSpentMs * (summary.incorrectCount / Math.max(questions.length, 1)))} avg</p>
					</div>
				</div>
				<div class="time-card gray" onclick={() => openPreview("unattempted")} role="button" tabindex="0">
					<span class="tc-icon gray">−</span>
					<div>
						<b>Not Attempted</b>
						<p>{summary.unattemptedCount} questions</p>
					</div>
				</div>
			</div>
		</section>

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
		<section class="section-card">
			<p class="section-label">Question Map</p>
			<div class="qmap-grid">
				<div class="qmap-box green">
					<div class="qmap-box-header green">
						<span class="qmap-icon">✓</span>
						<b>Correct Questions ({correctNums.length})</b>
					</div>
					<div class="qmap-nums">
						{#each correctNums as n}
						<button class="qnum green" onclick={() => openPreview('correct', correctNums.indexOf(n))}>{n}</button>
						{/each}
					</div>
					{#if correctNums.length}
					<button class="qmap-view-btn green" onclick={() => openPreview('correct')}>View All Correct Questions →</button>
					{/if}
				</div>
				<div class="qmap-box red">
					<div class="qmap-box-header red">
						<span class="qmap-icon">✕</span>
						<b>Wrong Questions ({incorrectNums.length})</b>
					</div>
					<div class="qmap-nums">
						{#each incorrectNums as n}
						<button class="qnum red" onclick={() => openPreview('incorrect', incorrectNums.indexOf(n))}>{n}</button>
						{/each}
					</div>
					{#if incorrectNums.length}
					<button class="qmap-view-btn red" onclick={() => openPreview('incorrect')}>View All Wrong Questions →</button>
					{/if}
				</div>
				<div class="qmap-box gray">
					<div class="qmap-box-header gray">
						<span class="qmap-icon">−</span>
						<b>Not Attempted ({unattemptedNums.length})</b>
					</div>
					<div class="qmap-nums">
						{#each unattemptedNums as n}
						<button class="qnum gray" onclick={() => openPreview('unattempted', unattemptedNums.indexOf(n))}>{n}</button>
						{/each}
					</div>
					{#if unattemptedNums.length}
					<button class="qmap-view-btn gray" onclick={() => openPreview('unattempted')}>View Not Attempted →</button>
					{/if}
				</div>
			</div>
		</section>

	</div><!-- /ap-body -->
</div><!-- /ap -->

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- QUESTION PREVIEW SIDEBAR                                                -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
{#if previewOpen}
<div class="overlay" onclick={() => previewOpen = false} role="button" tabindex="-1" aria-label="Close preview"></div>
<div class="preview-panel">
	<!-- nav bar -->
	<div class="preview-nav">
		<div class="preview-nav-top">
			<button class="preview-close" onclick={() => previewOpen = false}>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
				Questions Preview
			</button>
		</div>
		<div class="preview-nav-nums">
			{#each filteredQuestions as fq, i}
			<button class="pnav-num {previewIndex === i ? 'active' : ''}" onclick={() => previewIndex = i}>{(fq.order ?? i) + 1}</button>
			{/each}
		</div>
	</div>

	{#if previewQuestion}
	{@const q = previewQuestion}
	{@const qNum = (q.order ?? previewIndex) + 1}
	{@const correctIds = q.correct?.identifiers ?? []}
	{@const selectedIds = q.answer?.identifiers ?? []}
	{@const opts = q.prompt?.en?.options ?? q.prompt?.options ?? q.options ?? []}
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
					<span class="pm-dot green" title="Correct">●</span>
				{:else if q.isAttempted}
					<span class="pm-dot red" title="Wrong">●</span>
				{:else}
					<span class="pm-dot gray" title="Skipped">●</span>
				{/if}
			</div>
		</div>

		<!-- question text -->
		<div class="preview-qtext math-content">
			<MathText content={q.prompt?.en?.content ?? q.prompt?.content ?? "Question not available"} />
		</div>

		<!-- question images -->
		{#if q.prompt?.en?.images?.length}
		<div class="preview-images">
			{#each q.prompt.en.images as img}
			<img src={img.url ?? img} alt="Question figure" class="preview-img" />
			{/each}
		</div>
		{/if}

		<!-- options — 2 column grid like screenshot -->
		{#if opts.length}
		<div class="preview-options-grid">
			{#each opts as opt}
			{@const isCorrect = correctIds.includes(opt.identifier)}
			{@const isSelected = selectedIds.includes(opt.identifier)}
			<div class="preview-opt"
				class:opt-correct={isCorrect}
				class:opt-wrong={isSelected && !isCorrect}
			>
				<span class="opt-circle"
					class:oc-green={isCorrect}
					class:oc-red={isSelected && !isCorrect}
					class:oc-blue={!isCorrect && !isSelected}
				>
					{opt.identifier}
				</span>
				<span class="opt-text math-content">
					<MathText content={opt.content ?? ""} />
				</span>
				{#if isSelected && isCorrect}
					<span class="opt-tag ot-correct">Your answer ✓</span>
				{:else if isCorrect}
					<span class="opt-tag ot-correct">Correct answer</span>
				{:else if isSelected}
					<span class="opt-tag ot-wrong">Your answer</span>
				{/if}
			</div>
			{/each}
		</div>
		{/if}

		<!-- prev / next -->
		<div class="preview-footer">
			<button class="pf-btn prev" disabled={previewIndex === 0} onclick={() => previewIndex--}>← Previous</button>
			<span class="pf-count">{previewIndex + 1} / {filteredQuestions.length}</span>
			<button class="pf-btn next" disabled={previewIndex === filteredQuestions.length - 1} onclick={() => previewIndex++}>Next →</button>
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
	.ap { min-height: 100vh; background: var(--analysis-page-bg, #f1f5f9); font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
	.ap-loading { padding: 4rem; text-align: center; color: #64748b; font-family: 'Inter', sans-serif; }

	/* ── header ── */
	.ap-header { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); color: #fff; padding: 1.1rem 1.5rem; box-shadow: 0 2px 12px rgba(30,58,138,0.3); }
	.ap-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 1rem; }
	.back-btn { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
	.back-btn:hover { background: rgba(255,255,255,0.28); }
	.ap-title { font-size: 1.05rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
	.ap-sub { font-size: 0.72rem; opacity: 0.7; margin: 0.15rem 0 0; letter-spacing: 0.01em; }
	.ap-badge { margin-left: auto; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; padding: 0.25rem 0.85rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }

	/* ── body ── */
	.ap-body { max-width: 1200px; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

	/* ── section card ── */
	.section-card { background: var(--analysis-card-bg, #fff); border: 1px solid var(--analysis-card-border, #e8edf5); border-radius: 14px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
	.section-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 1rem; }

	/* ── performance grid ── */
	.perf-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 2rem; }
	@media (max-width: 640px) { .perf-grid { grid-template-columns: 1fr; } }

	/* score box */
	.score-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 2rem 1.5rem; border: 1px solid #bfdbfe; }
	.score-label { font-size: 0.65rem; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
	.score-val { font-size: 3rem; font-weight: 800; color: #1e3a8a; line-height: 1; letter-spacing: -0.03em; margin: 0.25rem 0 0; }
	.score-val.neg { color: #dc2626; }
	.score-total { font-size: 0.8rem; color: #64748b; margin: 0; }
	.score-total span { font-weight: 700; color: #1e3a8a; font-size: 0.9rem; }
	.score-ring-wrap { position: relative; width: 84px; height: 84px; margin: 0.5rem 0; }
	.score-ring-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: #1e3a8a; }
	.score-sub-label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.04em; margin: 0; }
	.keep-trying-btn { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; border: none; border-radius: 24px; padding: 0.6rem 1.75rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; text-decoration: none; letter-spacing: 0.02em; box-shadow: 0 4px 16px rgba(124,58,237,0.45); transition: transform 0.15s, box-shadow 0.15s; }
	.keep-trying-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(124,58,237,0.55); }

	/* perf overview */
	.perf-overview { display: flex; flex-direction: column; gap: 1rem; }
	.perf-circles { display: flex; gap: 1.5rem; }
	.perf-circle { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; flex: 1; }
	.perf-circle b { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
	.perf-circle span:last-child { font-size: 0.72rem; color: #64748b; font-weight: 500; }
	.pc-icon { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; }
	.perf-circle.green .pc-icon { background: #dcfce7; color: #16a34a; }
	.perf-circle.green b { color: #16a34a; }
	.perf-circle.red .pc-icon { background: #fee2e2; color: #dc2626; }
	.perf-circle.red b { color: #dc2626; }
	.perf-circle.gray .pc-icon { background: #f1f5f9; color: #64748b; }
	.perf-circle.gray b { color: #475569; }

	/* progress bars */
	.perf-bars { display: flex; flex-direction: column; gap: 0.65rem; }
	.pb-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; }
	.pb-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
	.pb-dot.green { background: #22c55e; }
	.pb-dot.red { background: #ef4444; }
	.pb-dot.gray { background: #94a3b8; }
	.pb-label { width: 88px; color: #64748b; font-weight: 500; }
	.pb-track { flex: 1; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
	.pb-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
	.pb-fill.green { background: #22c55e; }
	.pb-fill.red { background: #ef4444; }
	.pb-fill.gray { background: #94a3b8; }
	.pb-pct { width: 34px; text-align: right; font-weight: 700; color: #475569; font-size: 0.75rem; }

	/* ── key metrics ── */
	.km-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
	@media (max-width: 640px) { .km-grid { grid-template-columns: repeat(2, 1fr); } }
	.km-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 1.1rem 0.75rem; border-radius: 12px; border: 1px solid #e8edf5; background: #fafbff; transition: transform 0.15s; }
	.km-item:hover { transform: translateY(-2px); }
	.km-icon { font-size: 1.3rem; }
	.km-lbl { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
	.km-val { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; }
	.km-val.blue { color: #3b82f6; }
	.km-val.green { color: #16a34a; }
	.km-val.purple { color: #7c3aed; }
	.km-val.red { color: #dc2626; }

	/* ── qmap buttons ── */
	.qmap-btns { display: flex; gap: 1rem; }
	.qmap-btn { flex: 1; display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.25rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; letter-spacing: 0.01em; transition: opacity 0.15s; }
	.qmap-btn:hover { opacity: 0.9; }
	.qmap-btn.blue { background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #fff; box-shadow: 0 3px 10px rgba(30,58,138,0.25); }
	.qmap-btn.orange { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }

	/* ── table ── */
	.table-header-bar { background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #fff; padding: 0.75rem 1rem; border-radius: 8px 8px 0 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.02em; margin-bottom: 0; }
	.table-wrap { overflow-x: auto; border: 1px solid #e8edf5; border-radius: 0 0 8px 8px; }
	.perf-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
	.perf-table th { padding: 0.75rem 1rem; text-align: left; color: #64748b; font-weight: 600; border-bottom: 1px solid #e8edf5; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.perf-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 500; }
	.perf-table td.green { color: #16a34a; font-weight: 700; }
	.perf-table td.red { color: #dc2626; font-weight: 700; }
	.perf-table tbody tr:hover { background: #f8fafc; }
	.perf-table tbody tr:last-child td { border-bottom: none; }

	/* ── time cards ── */
	.time-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem; }
	@media (max-width: 640px) { .time-cards { grid-template-columns: 1fr; } }
	.time-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-radius: 12px; cursor: pointer; border: none; text-align: left; transition: transform 0.15s; }
	.time-card:hover { transform: translateY(-2px); }
	.time-card.green { background: #f0fdf4; border: 1px solid #bbf7d0; }
	.time-card.red { background: #fff1f2; border: 1px solid #fecdd3; }
	.time-card.gray { background: #f8fafc; border: 1px solid #e2e8f0; }
	.time-card b { font-size: 0.85rem; color: #1e293b; font-weight: 700; }
	.time-card p { font-size: 0.72rem; color: #64748b; margin: 0.2rem 0 0; }
	.tc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; flex-shrink: 0; }
	.tc-icon.green { background: #22c55e; color: #fff; }
	.tc-icon.red { background: #ef4444; color: #fff; }
	.tc-icon.gray { background: #94a3b8; color: #fff; }

	/* ── advanced analysis — now in AdvancedAnalysis.svelte component ── */

	/* ── question map ── */
	.qmap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
	@media (max-width: 768px) { .qmap-grid { grid-template-columns: 1fr; } }
	.qmap-box { border-radius: 10px; overflow: hidden; }
	.qmap-box-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; font-size: 0.875rem; font-weight: 700; color: #fff; }
	.qmap-box-header.green { background: #16a34a; }
	.qmap-box-header.red { background: #dc2626; }
	.qmap-box-header.gray { background: #475569; }
	.qmap-icon { font-size: 1rem; }
	.qmap-nums { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.875rem; background: #f8fafc; min-height: 60px; }
	.qmap-box.green .qmap-nums { background: #f0fdf4; }
	.qmap-box.red .qmap-nums { background: #fff1f2; }
	.qnum { width: 32px; height: 32px; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.qnum.green { background: #dcfce7; color: #16a34a; }
	.qnum.red { background: #fee2e2; color: #dc2626; }
	.qnum.gray { background: #e2e8f0; color: #475569; }
	.qnum:hover { opacity: 0.8; }
	.qmap-view-btn { width: 100%; padding: 0.75rem; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
	.qmap-view-btn.green { background: #16a34a; color: #fff; }
	.qmap-view-btn.red { background: #dc2626; color: #fff; }
	.qmap-view-btn.gray { background: #475569; color: #fff; }

	/* ── preview overlay ── */
	.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 300; cursor: pointer; }
	.preview-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(700px, 100vw); background: #fff; z-index: 301; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.15); overflow: hidden; }
	:global([data-theme="dark"]) .preview-panel { background: #1e293b; }

	/* preview nav */
	.preview-nav { background: #1e3a8a; color: #fff; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
	.preview-nav-top { display: flex; align-items: center; }
	.preview-close { background: none; border: none; color: #fff; font-size: 0.875rem; font-weight: 700; cursor: pointer; text-align: left; padding: 0; display: flex; align-items: center; gap: 0.5rem; }
	.preview-nav-nums { display: flex; gap: 0.35rem; flex-wrap: wrap; max-height: 90px; overflow-y: auto; padding-top: 0.25rem; }
	.pnav-num { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: #fff; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; }
	.pnav-num.active { background: #fff; color: #1e3a8a; }
	.pnav-num:hover:not(.active) { background: rgba(255,255,255,0.2); }

	/* preview body */
	.preview-body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

	/* meta row */
	.preview-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
	.pm-qnum { width: 32px; height: 32px; border-radius: 50%; background: #ef4444; color: #fff; font-size: 0.875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
	.pm-times { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
	.pm-sep { opacity: 0.4; }
	.pm-badge { background: #eff6ff; color: #3b82f6; border-radius: 4px; padding: 0.2rem 0.6rem; font-size: 0.7rem; font-weight: 700; }
	.pm-status-icons { margin-left: auto; display: flex; gap: 0.4rem; }
	.pm-dot { font-size: 1.25rem; line-height: 1; }
	.pm-dot.green { color: #22c55e; }
	.pm-dot.red { color: #ef4444; }
	.pm-dot.gray { color: #94a3b8; }

	/* question text */
	.preview-qtext { font-size: 0.9375rem; color: #1e293b; line-height: 1.7; padding: 1rem 1.25rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
	:global([data-theme="dark"]) .preview-qtext { background: #0f172a; color: #e2e8f0; border-color: #334155; }
	.math-content :global(mjx-container) { display: inline !important; }
	.math-content :global(.MathJax) { display: inline !important; }

	/* images */
	.preview-images { display: flex; flex-direction: column; gap: 0.5rem; }
	.preview-img { max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0; }

	/* options 2-col grid */
	.preview-options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
	@media (max-width: 480px) { .preview-options-grid { grid-template-columns: 1fr; } }

	.preview-opt { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem 1.75rem; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #f8fafc; font-size: 0.875rem; color: #1e293b; position: relative; min-height: 56px; }
	:global([data-theme="dark"]) .preview-opt { background: #1e293b; border-color: #334155; color: #e2e8f0; }
	/* correct answer — faint green, dark text */
	.preview-opt.opt-correct { background: #f0fdf4; border-color: #86efac; color: #14532d; }
	/* wrong selected — faint red, dark text */
	.preview-opt.opt-wrong { background: #fff1f2; border-color: #fca5a5; color: #7f1d1d; }

	.opt-circle { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
	.opt-circle.oc-blue { background: #e0e7ff; color: #3730a3; }
	:global([data-theme="dark"]) .opt-circle.oc-blue { background: #3730a3; color: #e0e7ff; }
	.opt-circle.oc-green { background: #16a34a; color: #fff; }
	.opt-circle.oc-red { background: #dc2626; color: #fff; }

	.opt-text { flex: 1; line-height: 1.5; word-break: break-word; }
	.opt-tag { position: absolute; bottom: 5px; right: 8px; font-size: 0.6rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 3px; }
	.ot-correct { background: #16a34a; color: #fff; }
	.ot-wrong { background: #dc2626; color: #fff; }

	/* footer */
	.preview-footer { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0 0; border-top: 1px solid #e2e8f0; margin-top: auto; }
	:global([data-theme="dark"]) .preview-footer { border-color: #334155; }
	.pf-count { font-size: 0.8rem; color: #64748b; }
	.pf-btn { padding: 0.6rem 1.5rem; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
	.pf-btn.prev { background: #f1f5f9; color: #475569; }
	.pf-btn.next { background: #22c55e; color: #fff; }
	.pf-btn:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
