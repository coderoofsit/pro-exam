<script lang="ts">
	import { tick } from "svelte";
	import MathText from "$lib/components/MathText.svelte";

	let {
		questions = [], bySubject = [], byChapter = [], byKind = [],
		testName = "", fmt,
	}: {
		questions: any[]; bySubject: any[]; byChapter: any[]; byChapterGroup?: any[];
		byKind: any[]; testName?: string; fmt: (ms: number) => string;
	} = $props();

	// ── modal state ───────────────────────────────────────────────────────────
	let openModal = $state<string | null>(null);
	let activeTab = $state("");

	// ── preview state ─────────────────────────────────────────────────────────
	let previewOpen = $state(false);
	let previewIndex = $state(0);
	let pvFilter = $state<"all"|"correct"|"wrong"|"skip">("all");
	let contextQs = $state<any[]>([]);

	const displayQs = $derived.by(() => {
		if (pvFilter === "correct") return contextQs.filter((q:any) => q.isCorrect === true);
		if (pvFilter === "wrong")   return contextQs.filter((q:any) => q.isAttempted && q.isCorrect === false);
		if (pvFilter === "skip")    return contextQs.filter((q:any) => !q.isAttempted);
		return contextQs;
	});
	const previewQ = $derived(displayQs[previewIndex] ?? null);

	const pvCounts = $derived({
		all: contextQs.length,
		correct: contextQs.filter((q:any) => q.isCorrect === true).length,
		wrong: contextQs.filter((q:any) => q.isAttempted && q.isCorrect === false).length,
		skip: contextQs.filter((q:any) => !q.isAttempted).length,
	});

	async function openPreview(subset: any[], idx = 0) {
		previewOpen = false;
		await tick();
		contextQs = subset.filter(Boolean);
		pvFilter = "all";
		previewIndex = idx;
		previewOpen = true;
	}

	// helpers to build subsets
	function qsBySubject(subId: string) {
		return questions.filter((q: any) => (q.subjectId?._id ?? q.subjectId) === subId);
	}
	function qsByChapter(chapterId: string) {
		return questions.filter((q: any) => (q.chapterId?._id ?? q.chapterId) === chapterId);
	}
	function qsByKind(kind: string) {
		const result = questions.filter((q: any) => (q.questionKind ?? q.kind ?? "").trim() === kind.trim());
		return result.length > 0 ? result : questions.filter((q: any) => String(q.questionKind ?? q.kind ?? "").toLowerCase() === kind.toLowerCase());
	}
	function qsByMarks(marks: number) {
		return questions.filter((q: any) => (q.marks ?? 0) === marks);
	}

	// ── subject / chapter tabs ────────────────────────────────────────────────
	const subjectTabs = $derived(bySubject.map((s: any) => ({
		id: s.subjectId?._id ?? s.subjectId,
		name: s.subjectId?.name?.en ?? s.subjectId?.name ?? "Subject",
		data: s,
	})));
	const chapterTabs = $derived(byChapter.map((c: any) => ({
		id: c.chapterId?._id ?? c.chapterId,
		label: chapterLabel(c.chapterId?._id ?? c.chapterId),
		data: c,
	})));

	$effect(() => {
		if (openModal === "subject"      && subjectTabs.length && !activeTab) activeTab = subjectTabs[0].id;
		if (openModal === "chapter"      && chapterTabs.length && !activeTab) activeTab = chapterTabs[0].id;
		if (openModal === "questiontype" && byKind.length      && !activeTab) activeTab = byKind[0].kind;
		if (openModal === "marks"        && marksBuckets.length && !activeTab) activeTab = String(marksBuckets[0].marks);
	});

	function chapterLabel(id: string) {
		const q = questions.find((q: any) => (q.chapterId?._id ?? q.chapterId) === id);
		return q?.chapterSlug?.replace(/-/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase()) ?? id ?? "Chapter";
	}
	function chaptersForSubject(subId: string) {
		const seen = new Set<string>(); const result: any[] = [];
		for (const q of questions) {
			if ((q.subjectId?._id ?? q.subjectId) !== subId) continue;
			const cid = q.chapterId?._id ?? q.chapterId;
			if (!cid || seen.has(cid)) continue;
			seen.add(cid);
			result.push({ cid, label: chapterLabel(cid), stat: byChapter.find((c:any)=>(c.chapterId?._id??c.chapterId)===cid) });
		}
		return result;
	}

	const marksBuckets = $derived.by(() => {
		const map = new Map<number,any>();
		for (const q of questions) {
			const m = q.marks ?? 0;
			if (!map.has(m)) map.set(m,{marks:m,total:0,correct:0,incorrect:0,unattempted:0,timeMs:0});
			const b = map.get(m)!; b.total++;  b.timeMs += q.timeSpentMs??0;
			if (q.isCorrect===true) b.correct++; else if (q.isAttempted) b.incorrect++; else b.unattempted++;
		}
		return [...map.values()].sort((a,b)=>b.marks-a.marks);
	});

	function openView(view: string) { openModal = view; activeTab = ""; }
	function closeModal() { openModal = null; activeTab = ""; previewOpen = false; }

	const cards = [
		{id:"chapter",      icon:"📖", label:"Chapter Wise",      desc:"Analyze by chapter to identify strengths and improvement areas."},
		{id:"subject",      icon:"📚", label:"Subject Wise",       desc:"Analyze by subject to identify strengths and improvement areas."},
		{id:"questiontype", icon:"❓", label:"Question Type Wise", desc:"Analyze by question type to identify strengths and improvement areas."},
		{id:"marks",        icon:"⭐", label:"Marks Wise",         desc:"Analyze by marks wise to identify strengths and improvement areas."},
	];
	const modalTitles: Record<string,string> = {
		subject:"Subject Wise Analysis", chapter:"Chapter Wise Analysis",
		questiontype:"Question Type Wise Analysis", marks:"Marks Wise Analysis",
	};
</script>

<!-- ── Cards ── -->
<div class="aa-wrap">
	<p class="aa-label">Advanced Analysis</p>
	<div class="aa-cards">
		{#each cards as card}
		<button class="aa-card" onclick={() => openView(card.id)}>
			<span class="aa-icon">{card.icon}</span>
			<b>{card.label}</b>
			<p>{card.desc}</p>
			<span class="aa-link">View Analysis →</span>
		</button>
		{/each}
	</div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!-- ANALYSIS MODAL                                                         -->
<!-- ══════════════════════════════════════════════════════════════════════ -->
{#if openModal}
<div class="m-overlay" onclick={closeModal} role="button" tabindex="-1" aria-label="Close"></div>
<div class="m-panel">
	<div class="m-header">
		<button class="m-back" onclick={closeModal} aria-label="Back">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</button>
		<h2 class="m-title">{modalTitles[openModal] ?? "Analysis"}</h2>
	</div>
	<div class="m-body">

		<!-- SUBJECT WISE -->
		{#if openModal === "subject" && subjectTabs.length}
		<div class="pill-tabs">
			{#each subjectTabs as st}
			<button class="pill-tab {activeTab===st.id?'active':''}" onclick={()=>activeTab=st.id}>{st.name}</button>
			{/each}
		</div>
		{#each subjectTabs as st}{#if activeTab===st.id}{@const s=st.data}{@const subId=st.id}
		<div class="stat-dots"><span class="sd green"></span>Correct {s.correctCount}<span class="sd red ml"></span>Wrong {s.incorrectCount}<span class="sd gray ml"></span>None {s.unattemptedCount}</div>
		<div class="mbar"><div class="mc"><span>Score</span><b>{s.obtainedMarks}/{s.totalMarks}</b></div><div class="mc"><span>Attempted</span><b>{s.attemptedCount}/{s.totalQuestions}</b></div><div class="mc"><span>Time</span><b>{fmt(s.timeSpentMs)}</b></div><div class="mc"><span>Accuracy</span><b>{s.accuracy.toFixed(2)}%</b></div></div>
		<button class="vq-btn full" onclick={async () => { await openPreview(qsBySubject(subId)); }}>View Questions</button>
		{@const chs=chaptersForSubject(subId)}
		{#if chs.length}<h3 class="sub-head">Chapters</h3>
		<div class="ch-grid">
			{#each chs as ch}{@const cs=ch.stat}
			<div class="ch-card"><b class="ch-name">{ch.label}</b>
				{#if cs}<div class="stat-dots small"><span class="sd green"></span>{cs.correctCount}<span class="sd red ml"></span>{cs.incorrectCount}<span class="sd gray ml"></span>{cs.unattemptedCount}</div>
				<div class="mbar small"><div class="mc"><span>Score</span><b>{cs.obtainedMarks}/{cs.totalMarks}</b></div><div class="mc"><span>Attempted</span><b>{cs.attemptedCount}/{cs.totalQuestions}</b></div><div class="mc"><span>Time</span><b>{fmt(cs.timeSpentMs)}</b></div><div class="mc"><span>Accuracy</span><b>{cs.accuracy.toFixed(2)}%</b></div></div>{/if}
				<button class="vq-btn" onclick={async () => { await openPreview(qsByChapter(ch.cid)); }}>View Questions</button>
			</div>{/each}
		</div>{/if}
		{/if}{/each}
		{/if}

		<!-- CHAPTER WISE -->
		{#if openModal === "chapter" && chapterTabs.length}
		<div class="pill-tabs scrollable">
			{#each chapterTabs as ct}
			<button class="pill-tab {activeTab===ct.id?'active':''}" onclick={()=>activeTab=ct.id}>{ct.label}</button>
			{/each}
		</div>
		{#each chapterTabs as ct}{#if activeTab===ct.id}{@const ch=ct.data}{@const chId=ct.id}
		<div class="stat-dots"><span class="sd green"></span>Correct {ch.correctCount}<span class="sd red ml"></span>Wrong {ch.incorrectCount}<span class="sd gray ml"></span>None {ch.unattemptedCount}</div>
		<div class="mbar"><div class="mc"><span>Score</span><b>{ch.obtainedMarks}/{ch.totalMarks}</b></div><div class="mc"><span>Attempted</span><b>{ch.attemptedCount}/{ch.totalQuestions}</b></div><div class="mc"><span>Time</span><b>{fmt(ch.timeSpentMs)}</b></div><div class="mc"><span>Accuracy</span><b>{ch.accuracy.toFixed(2)}%</b></div></div>
		<button class="vq-btn full" onclick={async () => { await openPreview(qsByChapter(chId)); }}>View Questions</button>
		<h3 class="sub-head">Papers</h3>
		<div class="paper-card"><b>{testName||"This Test"}</b>
			<div class="stat-dots small" style="margin-top:.4rem"><span class="sd green"></span>{ch.correctCount}<span class="sd red ml"></span>{ch.incorrectCount}<span class="sd gray ml"></span>{ch.unattemptedCount}</div>
			<div class="mbar small"><div class="mc"><span>Score</span><b>{ch.obtainedMarks}/{ch.totalMarks}</b></div><div class="mc"><span>Attempted</span><b>{ch.attemptedCount}/{ch.totalQuestions}</b></div><div class="mc"><span>Time</span><b>{fmt(ch.timeSpentMs)}</b></div><div class="mc"><span>Accuracy</span><b>{ch.accuracy.toFixed(2)}%</b></div></div>
			<button class="vq-btn" onclick={async () => { await openPreview(qsByChapter(chId)); }}>View Questions</button>
		</div>
		{/if}{/each}
		{/if}

		<!-- QUESTION TYPE WISE -->
		{#if openModal === "questiontype" && byKind.length}
		<div class="ch-grid">
			{#each byKind as k (k.kind)}
			{@const kindKey = k.kind}
			<div class="ch-card"><b class="ch-name">{kindKey}</b>
				<div class="stat-dots small"><span class="sd green"></span>{k.correctCount}<span class="sd red ml"></span>{k.incorrectCount}<span class="sd gray ml"></span>{k.unattemptedCount}</div>
				<div class="mbar small"><div class="mc"><span>Score</span><b>{k.obtainedMarks}/{k.totalMarks}</b></div><div class="mc"><span>Attempted</span><b>{k.attemptedCount}/{k.totalQuestions}</b></div><div class="mc"><span>Time</span><b>{fmt(k.timeSpentMs)}</b></div><div class="mc"><span>Accuracy</span><b>{k.accuracy.toFixed(2)}%</b></div></div>
				<button class="vq-btn" onclick={async () => { await openPreview(qsByKind(kindKey)); }}>View Questions</button>
			</div>
			{/each}
		</div>
		{/if}

		<!-- MARKS WISE -->
		{#if openModal === "marks" && marksBuckets.length}
		<div class="pill-tabs">
			{#each marksBuckets as b (b.marks)}
			{@const mk = b.marks}
			<button class="pill-tab {activeTab===String(mk)?'active':''}" onclick={()=>activeTab=String(mk)}>
				Marks {mk}
			</button>
			{/each}
		</div>
		{#each marksBuckets as b (b.marks)}
		{#if activeTab===String(b.marks)}
		{@const mk=b.marks}
		<div class="stat-dots"><span class="sd green"></span>Correct {b.correct}<span class="sd red ml"></span>Wrong {b.incorrect}<span class="sd gray ml"></span>None {b.unattempted}</div>
		<div class="mbar">
			<div class="mc"><span>Score</span><b>{((b.correct*mk)-(b.incorrect*0.25*mk)).toFixed(2)}/{b.total*mk}</b></div>
			<div class="mc"><span>Attempted</span><b>{b.correct+b.incorrect}/{b.total}</b></div>
			<div class="mc"><span>Time</span><b>{fmt(b.timeMs)}</b></div>
			<div class="mc"><span>Accuracy</span><b>{b.total>0?((b.correct/(b.correct+b.incorrect||1))*100).toFixed(2):0}%</b></div>
		</div>
		<button class="vq-btn full" onclick={async()=>{await openPreview(qsByMarks(mk));}}>View Questions</button>

		<!-- subjects breakdown for this marks bucket -->
		{@const marksQs = qsByMarks(mk)}
		{@const subjectsInBucket = [...new Map(marksQs.map((q:any)=>[(q.subjectId?._id??q.subjectId), q])).entries()].map(([sid])=>sid).filter(Boolean)}
		{#if subjectsInBucket.length}
		<h3 class="sub-head">Subjects</h3>
		<div class="ch-grid">
			{#each subjectsInBucket as sid}
			{@const subQs = marksQs.filter((q:any)=>(q.subjectId?._id??q.subjectId)===sid)}
			{@const subStat = bySubject.find((s:any)=>(s.subjectId?._id??s.subjectId)===sid)}
			{@const subName = subStat?.subjectId?.name?.en ?? subStat?.subjectId?.name ?? sid}
			{@const sc = subQs.filter((q:any)=>q.isCorrect===true).length}
			{@const sw = subQs.filter((q:any)=>q.isAttempted&&q.isCorrect===false).length}
			{@const sn = subQs.filter((q:any)=>!q.isAttempted).length}
			{@const st = subQs.reduce((a:number,q:any)=>a+(q.timeSpentMs??0),0)}
			<div class="ch-card">
				<b class="ch-name">{subName}</b>
				<div class="stat-dots small"><span class="sd green"></span>Correct {sc}<span class="sd red ml"></span>Wrong {sw}<span class="sd gray ml"></span>None {sn}</div>
				<div class="mbar small">
					<div class="mc"><span>Score</span><b>{((sc*mk)-(sw*0.25*mk)).toFixed(2)}/{subQs.length*mk}</b></div>
					<div class="mc"><span>Attempted</span><b>{sc+sw}/{subQs.length}</b></div>
					<div class="mc"><span>Time</span><b>{fmt(st)}</b></div>
					<div class="mc"><span>Accuracy</span><b>{sc+sw>0?((sc/(sc+sw))*100).toFixed(2):0}%</b></div>
				</div>
				<button class="vq-btn" onclick={async()=>{await openPreview(subQs);}}>View Questions</button>
			</div>
			{/each}
		</div>
		{/if}
		{/if}
		{/each}
		{/if}

	</div><!-- /m-body -->

	<!-- QUESTION PREVIEW -->
	{#if previewOpen}
	<div class="pv-overlay" onclick={()=>previewOpen=false} role="button" tabindex="-1" aria-label="Close preview"></div>
	{#key contextQs}
	<div class="pv-panel">
		<div class="pv-nav">
			<div class="pv-nav-top">
				<button class="pv-close" onclick={()=>previewOpen=false}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
					Questions Preview
				</button>
			</div>
			<!-- Correct / Wrong / Not Attempted filter tabs -->
			<div class="pv-filter-tabs">
				<button class="pv-ftab {pvFilter==='all'?'active':''}" onclick={()=>{pvFilter='all';previewIndex=0;}}>All ({pvCounts.all})</button>
				<button class="pv-ftab correct {pvFilter==='correct'?'active':''}" onclick={()=>{pvFilter='correct';previewIndex=0;}}>Correct ({pvCounts.correct})</button>
				<button class="pv-ftab wrong {pvFilter==='wrong'?'active':''}" onclick={()=>{pvFilter='wrong';previewIndex=0;}}>Wrong ({pvCounts.wrong})</button>
				<button class="pv-ftab skip {pvFilter==='skip'?'active':''}" onclick={()=>{pvFilter='skip';previewIndex=0;}}>Not Attempted ({pvCounts.skip})</button>
			</div>
			<div class="pv-nums">
				{#each displayQs as cq, i}
				{@const globalNum = (cq.order ?? i) + 1}
				<button class="pv-num {previewIndex===i?'active':''}" onclick={()=>previewIndex=i}>{globalNum}</button>
				{/each}
			</div>
		</div>
		{#if previewQ}
		{@const q=previewQ}
		{@const globalNum = (q.order ?? previewIndex) + 1}
		{@const correctIds=q.correct?.identifiers??[]}
		{@const selectedIds=q.answer?.identifiers??[]}
		{@const opts=q.prompt?.en?.options??q.prompt?.options??q.options??[]}
		<div class="pv-body">
			<div class="pv-meta">
				<span class="pv-qnum">{globalNum}</span>
				<div class="pv-times"><span>{fmt(q.timeSpentMs??0)}</span><span class="pv-sep">|</span><span>+{q.marks??0} / -{q.negMarks??0}</span></div>
				<span class="pv-badge">{q.questionKind??"MCQ"}</span>
				<div class="pv-status">
					{#if q.isCorrect===true}<span class="pv-dot green">●</span>
					{:else if q.isAttempted}<span class="pv-dot red">●</span>
					{:else}<span class="pv-dot gray">●</span>{/if}
				</div>
			</div>
			<div class="pv-qtext math-content"><MathText content={q.prompt?.en?.content??q.prompt?.content??"Question not available"}/></div>
			{#if q.prompt?.en?.images?.length}
			<div class="pv-imgs">{#each q.prompt.en.images as img}<img src={img.url??img} alt="figure" class="pv-img"/>{/each}</div>
			{/if}
			{#if opts.length}
			<div class="pv-opts">
				{#each opts as opt}
				{@const isCorrect=correctIds.includes(opt.identifier)}
				{@const isSelected=selectedIds.includes(opt.identifier)}
				<div class="pv-opt" class:opt-correct={isCorrect} class:opt-wrong={isSelected&&!isCorrect}>
					<span class="oc" class:oc-green={isCorrect} class:oc-red={isSelected&&!isCorrect} class:oc-blue={!isCorrect&&!isSelected}>{opt.identifier}</span>
					<span class="ot math-content"><MathText content={opt.content??""}/></span>
					{#if isSelected&&isCorrect}<span class="otag correct">Your answer ✓</span>
					{:else if isCorrect}<span class="otag correct">Correct answer</span>
					{:else if isSelected}<span class="otag wrong">Your answer</span>{/if}
				</div>
				{/each}
			</div>
			{/if}
			<div class="pv-footer">
				<button class="pf prev" disabled={previewIndex===0} onclick={()=>previewIndex--}>← Previous</button>
				<span class="pf-count">{previewIndex+1} / {displayQs.length}</span>
				<button class="pf next" disabled={previewIndex===displayQs.length-1} onclick={()=>previewIndex++}>Next →</button>
			</div>
		</div>
		{/if}
	</div>
	{/key}
	{/if}

</div><!-- /m-panel -->
{/if}

<style>
	/* cards */
	.aa-wrap{display:flex;flex-direction:column;gap:0}
	.aa-label{font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:0 0 1rem}
	.aa-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
	@media(max-width:900px){.aa-cards{grid-template-columns:repeat(2,1fr)}}
	@media(max-width:480px){.aa-cards{grid-template-columns:1fr}}
	.aa-card{display:flex;flex-direction:column;gap:.4rem;padding:1.1rem;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;text-align:left;cursor:pointer;transition:box-shadow .2s,transform .15s}
	.aa-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.1);transform:translateY(-2px)}
	.aa-icon{font-size:1.2rem;width:38px;height:38px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center}
	.aa-card b{font-size:.875rem;color:#1e293b}
	.aa-card p{font-size:.72rem;color:#64748b;margin:0;line-height:1.4}
	.aa-link{font-size:.72rem;color:#3b82f6;font-weight:600;margin-top:auto;padding-top:.25rem}

	/* modal */
	.m-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;cursor:pointer}
	.m-panel{position:fixed;inset:0;z-index:201;background:var(--analysis-page-bg,#f1f5f9);display:flex;flex-direction:column;overflow:hidden}
	.m-header{background:#1e3a8a;color:#fff;padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-shrink:0}
	.m-back{background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
	.m-back:hover{background:rgba(255,255,255,.25)}
	.m-title{font-size:1rem;font-weight:700;margin:0}
	.m-body{flex:1;overflow-y:auto;padding:1.5rem;max-width:1200px;width:100%;margin:0 auto}

	/* pill tabs */
	.pill-tabs{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem}
	.pill-tabs.scrollable{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
	.pill-tab{padding:.4rem 1.1rem;border-radius:20px;border:1.5px solid #e2e8f0;font-size:.8rem;font-weight:600;cursor:pointer;background:#fff;color:#475569;white-space:nowrap;transition:all .15s}
	.pill-tab.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}
	.pill-tab:hover:not(.active){background:#f1f5f9}

	/* stat dots */
	.stat-dots{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#475569;margin-bottom:.75rem}
	.stat-dots.small{font-size:.72rem;margin-bottom:.5rem}
	.sd{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
	.sd.green{background:#22c55e}.sd.red{background:#ef4444}.sd.gray{background:#94a3b8}
	.ml{margin-left:.5rem}

	/* metrics bar */
	.mbar{display:flex;gap:3rem;margin-bottom:1rem;flex-wrap:wrap}
	.mbar.small{gap:1.5rem;margin-bottom:.75rem}
	.mc{display:flex;flex-direction:column;gap:.1rem}
	.mc span{font-size:.7rem;color:#64748b}
	.mc b{font-size:.95rem;color:#1e293b;font-weight:700}
	.mbar.small .mc b{font-size:.8rem}

	/* view questions btn */
	.vq-btn{background:#eff6ff;color:#3b82f6;border:none;border-radius:6px;padding:.5rem 1rem;font-size:.8rem;font-weight:600;cursor:pointer;width:100%;transition:background .15s;margin-top:auto}
	.vq-btn:hover{background:#dbeafe}
	.vq-btn.full{margin-bottom:.25rem}

	.sub-head{font-size:.9rem;font-weight:700;color:#334155;margin:1.5rem 0 .75rem}

	/* chapter grid */
	.ch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
	@media(max-width:900px){.ch-grid{grid-template-columns:repeat(2,1fr)}}
	@media(max-width:480px){.ch-grid{grid-template-columns:1fr}}
	.ch-card{border:1px solid #e2e8f0;border-radius:10px;padding:1rem;background:#fff;display:flex;flex-direction:column;gap:.25rem}
	.ch-name{font-size:.875rem;color:#1e293b;display:block;margin-bottom:.4rem;text-transform:capitalize;font-weight:700}

	/* paper card */
	.paper-card{border:1px solid #e2e8f0;border-radius:10px;padding:1rem;background:#fff;max-width:400px;display:flex;flex-direction:column;gap:.25rem}
	.paper-card>b{font-size:.875rem;color:#1e293b;font-weight:700}

	/* marks table */
	.tw{overflow-x:auto;background:#fff;border-radius:10px;border:1px solid #e2e8f0}
	.mt{width:100%;border-collapse:collapse;font-size:.875rem}
	.mt th{padding:.75rem 1rem;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;white-space:nowrap;background:#f8fafc}
	.mt td{padding:.75rem 1rem;border-bottom:1px solid #f1f5f9;color:#334155}
	.mt tbody tr:hover{background:#f8fafc}
	.mt td.green{color:#16a34a;font-weight:600}.mt td.red{color:#dc2626;font-weight:600}.mt td.muted{color:#64748b}
	.mbadge{background:#eff6ff;color:#1d4ed8;border-radius:4px;padding:.15rem .5rem;font-weight:700;font-size:.8rem}
	.vq-btn-inline{background:#eff6ff;color:#3b82f6;border:none;border-radius:4px;padding:.3rem .7rem;font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap}
	.vq-btn-inline:hover{background:#dbeafe}

	/* ── question preview inside modal ── */
	.pv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:300;cursor:pointer}
	.pv-panel{position:fixed;top:0;right:0;bottom:0;width:min(700px,100vw);background:#fff;z-index:301;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.2);overflow:hidden}
	:global([data-theme="dark"]) .pv-panel{background:#1e293b}

	.pv-nav{background:#1e3a8a;color:#fff;padding:.75rem 1rem;display:flex;flex-direction:column;gap:.5rem;flex-shrink:0}
	.pv-nav-top{display:flex;align-items:center}
	.pv-close{background:none;border:none;color:#fff;font-size:.875rem;font-weight:700;cursor:pointer;padding:0;display:flex;align-items:center;gap:.5rem}

	/* filter tabs */
	.pv-filter-tabs{display:flex;gap:.4rem;flex-wrap:wrap}
	.pv-ftab{padding:.3rem .85rem;border-radius:16px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:rgba(255,255,255,.8);font-size:.72rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s}
	.pv-ftab:hover{background:rgba(255,255,255,.2)}
	.pv-ftab.active{background:#fff;color:#1e3a8a;border-color:#fff}
	.pv-ftab.correct.active{background:#22c55e;color:#fff;border-color:#22c55e}
	.pv-ftab.wrong.active{background:#ef4444;color:#fff;border-color:#ef4444}
	.pv-ftab.skip.active{background:#94a3b8;color:#fff;border-color:#94a3b8}
	.pv-nums{display:flex;gap:.35rem;flex-wrap:wrap;max-height:90px;overflow-y:auto;padding-top:.25rem}
	.pv-num{width:32px;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-size:.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center}
	.pv-num.active{background:#fff;color:#1e3a8a}
	.pv-num:hover:not(.active){background:rgba(255,255,255,.2)}

	.pv-body{flex:1;overflow-y:auto;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem}
	.pv-meta{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
	.pv-qnum{width:32px;height:32px;border-radius:50%;background:#ef4444;color:#fff;font-size:.875rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
	.pv-times{font-size:.75rem;color:#64748b;display:flex;align-items:center;gap:.4rem}
	.pv-sep{opacity:.4}
	.pv-badge{background:#eff6ff;color:#3b82f6;border-radius:4px;padding:.2rem .6rem;font-size:.7rem;font-weight:700}
	.pv-status{margin-left:auto}
	.pv-dot{font-size:1.25rem;line-height:1}
	.pv-dot.green{color:#22c55e}.pv-dot.red{color:#ef4444}.pv-dot.gray{color:#94a3b8}

	.pv-qtext{font-size:.9375rem;color:#1e293b;line-height:1.7;padding:1rem 1.25rem;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
	:global([data-theme="dark"]) .pv-qtext{background:#0f172a;color:#e2e8f0;border-color:#334155}
	.math-content :global(mjx-container){display:inline!important}
	.math-content :global(.MathJax){display:inline!important}

	.pv-imgs{display:flex;flex-direction:column;gap:.5rem}
	.pv-img{max-width:100%;border-radius:8px;border:1px solid #e2e8f0}

	.pv-opts{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
	@media(max-width:480px){.pv-opts{grid-template-columns:1fr}}
	.pv-opt{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem 1.75rem;border-radius:10px;border:1.5px solid #e2e8f0;background:#f8fafc;font-size:.875rem;color:#1e293b;position:relative;min-height:56px}
	:global([data-theme="dark"]) .pv-opt{background:#1e293b;border-color:#334155;color:#e2e8f0}
	.pv-opt.opt-correct{background:#f0fdf4;border-color:#86efac;color:#14532d}
	.pv-opt.opt-wrong{background:#fff1f2;border-color:#fca5a5;color:#7f1d1d}
	.oc{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;flex-shrink:0}
	.oc.oc-blue{background:#e0e7ff;color:#3730a3}
	.oc.oc-green{background:#16a34a;color:#fff}
	.oc.oc-red{background:#dc2626;color:#fff}
	.ot{flex:1;line-height:1.5;word-break:break-word}
	.otag{position:absolute;bottom:5px;right:8px;font-size:.6rem;font-weight:700;padding:.15rem .5rem;border-radius:3px}
	.otag.correct{background:#16a34a;color:#fff}
	.otag.wrong{background:#dc2626;color:#fff}

	.pv-footer{display:flex;align-items:center;justify-content:space-between;padding:1rem 0 0;border-top:1px solid #e2e8f0;margin-top:auto}
	:global([data-theme="dark"]) .pv-footer{border-color:#334155}
	.pf-count{font-size:.8rem;color:#64748b}
	.pf{padding:.6rem 1.5rem;border:none;border-radius:6px;font-size:.875rem;font-weight:600;cursor:pointer}
	.pf.prev{background:#f1f5f9;color:#475569}
	.pf.next{background:#22c55e;color:#fff}
	.pf:disabled{opacity:.35;cursor:not-allowed}
</style>
