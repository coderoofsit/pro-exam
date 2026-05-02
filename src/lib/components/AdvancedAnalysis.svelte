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
		{
			id:"chapter", 
			icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, 
			label:"Chapter Wise", 
			desc:"Identify strengths and areas to improve in specific chapters."
		},
		{
			id:"subject", 
			icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>`, 
			label:"Subject Wise", 
			desc:"Master performance trends across different test subjects."
		},
		{
			id:"questiontype", 
			icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`, 
			label:"Question Type", 
			desc:"Deep dive into MCQs, Integers, and various format stats."
		},
		{
			id:"marks", 
			icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, 
			label:"Marks Wise", 
			desc:"Filter questions by their individual weightage and difficulty."
		},
	];
	const modalTitles: Record<string,string> = {
		subject:"Subject Wise Analysis", chapter:"Chapter Wise Analysis",
		questiontype:"Question Type Wise Analysis", marks:"Marks Wise Analysis",
	};
</script>

<!-- ── Cards ── -->
<div class="aa-wrap">
	<div class="aa-cards">
		{#each cards as card}
		<button class="aa-card" onclick={() => openView(card.id)}>
			<span class="aa-icon">{@html card.icon}</span>
			<b>{card.label}</b>
			<p>{card.desc}</p>
			<span class="aa-link">Detailed Analysis →</span>
		</button>
		{/each}
	</div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════ -->
<!-- ANALYSIS MODAL                                                         -->
<!-- ══════════════════════════════════════════════════════════════════════ -->
{#if openModal}
<button type="button" class="m-overlay" onclick={closeModal} aria-label="Close"></button>
<div class="m-panel">
	<div class="m-head-stack">
	<header class="m-header">
		<div class="m-header-bar">
			<button class="m-back" onclick={closeModal} aria-label="Back">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
			</button>
			<div class="mh-title-box">
				<h2 class="m-title">{modalTitles[openModal] ?? "Analysis"}</h2>
				<p class="m-sub">Detailed performance breakdown</p>
			</div>
		</div>
	</header>
	</div>
	<nav class="m-nav-bar" aria-label="Analysis scope">
		<div class="m-nav-inner">
			<div class="pill-tabs scrollable">
			{#if openModal === "subject"}
				{#each subjectTabs as st}
					<button class="pill-tab {activeTab===st.id?'active':''}" onclick={()=>activeTab=st.id}>{st.name}</button>
				{/each}
			{:else if openModal === "chapter"}
				{#each chapterTabs as ct}
					<button class="pill-tab {activeTab===ct.id?'active':''}" onclick={()=>activeTab=ct.id}>{ct.label}</button>
				{/each}
			{:else if openModal === "marks"}
				{#each marksBuckets as b}
					<button class="pill-tab {activeTab===String(b.marks)?'active':''}" onclick={()=>activeTab=String(b.marks)}>Marks {b.marks}</button>
				{/each}
			{:else if openModal === "questiontype"}
				{#each byKind as k}
					<button class="pill-tab {activeTab===k.kind?'active':''}" onclick={()=>activeTab=k.kind}>{k.kind}</button>
				{/each}
			{/if}
			</div>
		</div>
	</nav>
	<div class="m-body">
		{#snippet HeroCard(title: string, cor: number, wrg: number, skp: number, obt: number|string, totM: number|string, att: number, totQ: number, timeMs: number, acc: number, qsFunc: () => any[])}
		<div class="mh-card">
			<div class="mh-chart-col">
				<div class="mh-donut" style="--acc: {acc};">
					<svg viewBox="0 0 36 36" class="mh-circ">
						<path class="mh-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
						<path class="mh-fg" stroke-dasharray="{acc}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
					</svg>
					<div class="mh-d-text">
						<b>{acc.toFixed(1)}%</b>
						<span>ACCURACY</span>
					</div>
				</div>
			</div>
			<div class="mh-stats-col">
				<div class="mh-stat-dots">
					<span class="sd-item"><span class="sd green"></span> Correct <b>{cor}</b></span>
					<span class="sd-item"><span class="sd red"></span> Wrong <b>{wrg}</b></span>
					<span class="sd-item"><span class="sd gray"></span> Skipped <b>{skp}</b></span>
				</div>
				<div class="mh-seg-bar">
					{#if cor>0}<div class="mh-seg green" style="width:{(cor/(cor+wrg+skp||1))*100}%"></div>{/if}
					{#if wrg>0}<div class="mh-seg red" style="width:{(wrg/(cor+wrg+skp||1))*100}%"></div>{/if}
					{#if skp>0}<div class="mh-seg dark" style="width:{(skp/(cor+wrg+skp||1))*100}%"></div>{/if}
				</div>
				<div class="mh-kpi-grid">
					<div class="mh-kpi">
						<span class="mh-kpi-lbl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> SCORE</span>
						<b>{obt}/{totM}</b>
					</div>
					<div class="mh-kpi">
						<span class="mh-kpi-lbl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> ATTEMPTED</span>
						<b>{att}/{totQ}</b>
					</div>
					<div class="mh-kpi">
						<span class="mh-kpi-lbl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> TIME</span>
						<b>{fmt(timeMs)}</b>
					</div>
					<div class="mh-kpi">
						<span class="mh-kpi-lbl"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ACCURACY</span>
						<b>{acc.toFixed(2)}%</b>
					</div>
				</div>
				<button class="mh-vq-btn" onclick={async() => { await openPreview(qsFunc()); }}>
					View Questions <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14m-7-7l7 7-7 7"/></svg>
				</button>
			</div>
		</div>
		{/snippet}

		{#snippet ChildGridCard(title: string, cor: number, wrg: number, skp: number, obt: number|string, totM: number|string, att: number, totQ: number, timeMs: number, acc: number, qsFunc: () => any[])}
		<button class="ch-card" onclick={async()=>{await openPreview(qsFunc());}}>
			<div class="cc-top">
				<b class="cc-title">{title}</b>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
			</div>
			<div class="cc-dots">
				<span class="cd-tag green"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg> {cor}</span>
				<span class="cd-tag red"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> {wrg}</span>
				<span class="cd-tag gray"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><line x1="5" y1="12" x2="19" y2="12"/></svg> {skp}</span>
			</div>
			<div class="cc-kpis">
				<div class="cc-kpi"><span class="cc-kpi-lbl">SCORE</span><b>{obt}/{totM}</b></div>
				<div class="cc-kpi"><span class="cc-kpi-lbl">ATTEMPTED</span><b>{att}/{totQ}</b></div>
				<div class="cc-kpi"><span class="cc-kpi-lbl">TIME</span><b>{fmt(timeMs)}</b></div>
				<div class="cc-kpi"><span class="cc-kpi-lbl">ACCURACY</span><b>{acc.toFixed(1)}%</b></div>
			</div>
		</button>
		{/snippet}

		<!-- SUBJECT WISE -->
		{#if openModal === "subject" && subjectTabs.length}
			{#each subjectTabs as st}{#if activeTab===st.id}{@const s=st.data}{@const subId=st.id}
				{@render HeroCard(st.name, s.correctCount, s.incorrectCount, s.unattemptedCount, s.obtainedMarks, s.totalMarks, s.attemptedCount, s.totalQuestions, s.timeSpentMs, s.accuracy, () => qsBySubject(subId))}
				
				{@const chs=chaptersForSubject(subId)}
				{#if chs.length}
					<div class="sh-head"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> Chapters <span class="sh-badge">{chs.length}</span></div>
					<div class="ch-grid">
						{#each chs as ch}{@const cs=ch.stat}
							{#if cs}
								{@render ChildGridCard(ch.label, cs.correctCount, cs.incorrectCount, cs.unattemptedCount, cs.obtainedMarks, cs.totalMarks, cs.attemptedCount, cs.totalQuestions, cs.timeSpentMs, cs.accuracy, () => qsByChapter(ch.cid))}
							{/if}
						{/each}
					</div>
				{/if}
			{/if}{/each}
		{/if}

		<!-- CHAPTER WISE -->
		{#if openModal === "chapter" && chapterTabs.length}
			{#each chapterTabs as ct}{#if activeTab===ct.id}{@const ch=ct.data}{@const chId=ct.id}
				{@render HeroCard(ct.label, ch.correctCount, ch.incorrectCount, ch.unattemptedCount, ch.obtainedMarks, ch.totalMarks, ch.attemptedCount, ch.totalQuestions, ch.timeSpentMs, ch.accuracy, () => qsByChapter(chId))}
				<div class="sh-head"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Papers <span class="sh-badge">1</span></div>
				<div class="ch-grid">
					{@render ChildGridCard(testName||"This Test", ch.correctCount, ch.incorrectCount, ch.unattemptedCount, ch.obtainedMarks, ch.totalMarks, ch.attemptedCount, ch.totalQuestions, ch.timeSpentMs, ch.accuracy, () => qsByChapter(chId))}
				</div>
			{/if}{/each}
		{/if}

		<!-- QUESTION TYPE WISE -->
		{#if openModal === "questiontype" && byKind.length}
			{#each byKind as k}{#if activeTab===k.kind}
				{@render HeroCard(k.kind, k.correctCount, k.incorrectCount, k.unattemptedCount, k.obtainedMarks, k.totalMarks, k.attemptedCount, k.totalQuestions, k.timeSpentMs, k.accuracy, () => qsByKind(k.kind))}
				
				<div class="ch-grid" style="margin-top: 1rem;">
					{@render ChildGridCard("All " + (k.kind||"Questions"), k.correctCount, k.incorrectCount, k.unattemptedCount, k.obtainedMarks, k.totalMarks, k.attemptedCount, k.totalQuestions, k.timeSpentMs, k.accuracy, () => qsByKind(k.kind))}
				</div>
			{/if}{/each}
		{/if}

		<!-- MARKS WISE -->
		{#if openModal === "marks" && marksBuckets.length}
			{#each marksBuckets as b}{#if activeTab===String(b.marks)}{@const mk=b.marks}
				{@const score = ((b.correct*mk)-(b.incorrect*0.25*mk))}
				{@const totM = b.total*mk}
				{@const att = b.correct+b.incorrect}
				{@const acc = b.total>0?((b.correct/(b.correct+b.incorrect||1))*100):0}
				
				{@render HeroCard(`Marks ${mk}`, b.correct, b.incorrect, b.unattempted, score.toFixed(2), totM, att, b.total, b.timeMs, acc, () => qsByMarks(mk))}

				{@const marksQs = qsByMarks(mk)}
				{@const subjectsInBucket = [...new Map(marksQs.map((q:any)=>[(q.subjectId?._id??q.subjectId), q])).entries()].map(([sid])=>sid).filter(Boolean)}
				{#if subjectsInBucket.length}
					<div class="sh-head"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg> Subjects <span class="sh-badge">{subjectsInBucket.length}</span></div>
					<div class="ch-grid">
						{#each subjectsInBucket as sid}
							{@const subQs = marksQs.filter((q:any)=>(q.subjectId?._id??q.subjectId)===sid)}
							{@const subStat = bySubject.find((s:any)=>(s.subjectId?._id??s.subjectId)===sid)}
							{@const subName = subStat?.subjectId?.name?.en ?? subStat?.subjectId?.name ?? sid}
							{@const sc = subQs.filter((q:any)=>q.isCorrect===true).length}
							{@const sw = subQs.filter((q:any)=>q.isAttempted&&q.isCorrect===false).length}
							{@const sn = subQs.filter((q:any)=>!q.isAttempted).length}
							{@const st = subQs.reduce((a:number,q:any)=>a+(q.timeSpentMs??0),0)}
							{@const sScore = ((sc*mk)-(sw*0.25*mk))}
							{@const sAcc = sc+sw>0?((sc/(sc+sw))*100):0}
							{@render ChildGridCard(subName, sc, sw, sn, sScore.toFixed(2), subQs.length*mk, sc+sw, subQs.length, st, sAcc, () => subQs)}
						{/each}
					</div>
				{/if}
			{/if}{/each}
		{/if}

	</div><!-- /m-body -->

	<!-- QUESTION PREVIEW -->
	{#if previewOpen}
	<button type="button" class="pv-overlay" onclick={()=>previewOpen=false} aria-label="Close preview"></button>
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
					{#if q.isCorrect===true}<span class="pv-answer-label pv-answer-correct">Correct Answer</span>
					{:else if q.isAttempted}<span class="pv-answer-label pv-answer-wrong">Wrong</span>
					{:else}<span class="pv-answer-label pv-answer-skip">Not attempted</span>{/if}
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
	.aa-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
	@media(max-width:900px){.aa-cards{grid-template-columns:repeat(2,1fr)}}
	@media(max-width:480px){.aa-cards{grid-template-columns:1fr}}
	.aa-card{display:flex;flex-direction:column;gap:.75rem;padding:1.5rem;border-radius:24px;border:1px solid var(--analysis-card-border, #f1f5f9);background:var(--analysis-card-bg, #fff);text-align:left;cursor:pointer;transition:all .3s ease;box-shadow:0 10px 30px rgba(0,0,0,0.03)}
	.aa-card:hover{background:var(--analysis-card-bg, #fff);transform:translateY(-4px);box-shadow:0 15px 40px rgba(0,0,0,0.08);border-color:var(--analysis-card-border, #e2e8f0)}
	.aa-icon{width:48px;height:48px;border-radius:14px;background:rgba(99, 102, 241, 0.08);color:#6366f1;display:flex;align-items:center;justify-content:center;transition:transform 0.3s ease}
	.aa-card:hover .aa-icon{transform:scale(1.1) rotate(5deg)}
	.aa-card b{font-size:.95rem;color:var(--text-color, #1e293b);font-weight:800;letter-spacing:-0.01em}
	.aa-card p{font-size:.75rem;color:#94a3b8;margin:0;line-height:1.5;font-weight:500}
	.aa-link{font-size:.7rem;color:#6366f1;font-weight:800;margin-top:auto;padding-top:.5rem;text-transform:uppercase;letter-spacing:0.04em}

	/* modal */
	.m-overlay{position:fixed;top:68px;right:0;bottom:0;left:var(--sb-width-expanded,240px);background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:200;cursor:pointer}
	.m-panel{position:fixed;top:68px;right:0;bottom:0;left:var(--sb-width-expanded,240px);z-index:201;background:var(--analysis-shell-bg,var(--analysis-page-bg,#0b0f19));display:flex;flex-direction:column;overflow:hidden;color:var(--page-text,#f8fafc);font-family:"Inter","Segoe UI",system-ui,sans-serif}
	@media (max-width: 767px) {
		.m-overlay,
		.m-panel {
			left: 0;
		}
	}

	/* Bluish bar: title only (brand-tinted, not flat gray-blue). */
	.m-head-stack {
		flex-shrink: 0;
		z-index: 10;
		background: linear-gradient(
			115deg,
			#1a3d78 0%,
			#244e9a 42%,
			#1a3568 100%
		);
		border-bottom: 1px solid rgba(96, 165, 250, 0.28);
	}
	.m-header {
		background: transparent;
		flex-shrink: 0;
	}
	.m-header-bar {
		padding: 0.5rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		max-width: 1150px;
		margin: 0 auto;
		width: 100%;
	}
	.m-back {
		background: rgba(255, 255, 255, 0.12);
		border: none;
		color: #fff;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.2s;
	}
	.m-back:hover {
		background: rgba(255, 255, 255, 0.22);
	}
	.mh-title-box {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}
	.m-title {
		font-size: 1rem;
		font-weight: 800;
		margin: 0;
		color: #fff;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}
	.m-sub {
		font-size: 0.68rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.88);
		margin: 0.05rem 0 0;
		line-height: 1.3;
		opacity: 0.95;
	}

	.m-nav-bar {
		flex-shrink: 0;
		z-index: 9;
		background: transparent;
		border-top: none;
		border-bottom: 1px solid var(--analysis-card-border, rgba(148, 163, 184, 0.18));
		display: flex;
		justify-content: center;
	}
	.m-nav-inner {
		max-width: 1150px;
		width: 100%;
		min-width: 0;
		padding: 0.35rem 1.25rem 0.45rem;
		display: flex;
		justify-content: flex-start;
	}
	@media (max-width: 640px) {
		.m-header-bar,
		.m-nav-inner {
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}
		.m-title {
			font-size: clamp(0.82rem, 3.5vw + 0.35rem, 1.1rem);
			white-space: nowrap;
			overflow-x: auto;
			overflow-y: hidden;
			max-width: 100%;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}
		.m-title::-webkit-scrollbar {
			display: none;
		}
	}
	.pill-tabs{display:flex;gap:0.45rem;padding:0;justify-content:flex-start;align-items:center}
	/* One row + horizontal scroll (all breakpoints) */
	.pill-tabs.scrollable{
		flex:1;
		min-width:0;
		width:100%;
		flex-wrap:nowrap;
		overflow-x:auto;
		overflow-y:hidden;
		max-width:100%;
		padding-bottom:4px;
		-webkit-overflow-scrolling:touch;
		scroll-snap-type:x proximity;
		scrollbar-width:none;
		overscroll-behavior-x:contain;
		touch-action:pan-x;
	}
	.pill-tabs.scrollable::-webkit-scrollbar{display:none}
	/* Neutral chips on page background (filter row, not navbar tint) */
	.m-nav-bar .pill-tab{
		padding:0.28rem 0.85rem;
		border-radius:999px;
		border:1px solid #e2e8f0;
		font-size:0.72rem;
		font-weight:700;
		cursor:pointer;
		background:#f8fafc;
		color:#475569;
		white-space:nowrap;
		flex-shrink:0;
		scroll-snap-align:start;
		transition:background 0.15s,color 0.15s,border-color 0.15s,box-shadow 0.15s;
	}
	.m-nav-bar .pill-tab:hover{
		background:#e2e8f0;
		color:#1e293b;
		border-color:#cbd5e1;
	}
	.m-nav-bar .pill-tab.active{
		background:#2563eb;
		color:#fff;
		border-color:#3b82f6;
		box-shadow:0 2px 10px rgba(37,99,235,0.35);
	}

	.m-body{flex:1;overflow-y:auto;padding:0 2.5rem 2.5rem;max-width:1150px;width:100%;margin:0 auto}

	/* Hero Card */
	.mh-card{background:var(--analysis-card-bg,#161b26);border:1px solid rgba(255,255,255,0.04);border-radius:24px;padding:2.5rem;display:flex;gap:4rem;margin-bottom:2.5rem;box-shadow:0 20px 50px rgba(0,0,0,0.3)}
	@media(max-width:850px){.mh-card{flex-direction:column;gap:2.5rem}}
	@media (max-width: 640px) {
		.mh-card {
			padding: 1.25rem 1rem;
			gap: 1.25rem;
			margin-bottom: 1.5rem;
		}
	}
	
	.mh-chart-col{display:flex;align-items:center;justify-content:center}
	.mh-donut{width:150px;height:150px;position:relative}
	.mh-circ{transform:rotate(-90deg);width:100%;height:100%}
	.mh-circ .mh-bg{fill:none;stroke:rgba(255,255,255,0.05);stroke-width:3}
	.mh-circ .mh-fg{fill:none;stroke:#10b981;stroke-width:3.5;stroke-linecap:round;transition:stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)}
	.mh-d-text{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
	.mh-d-text b{font-size:1.8rem;font-weight:900;color:var(--page-text,#fff);letter-spacing:-0.04em}
	.mh-d-text span{font-size:0.55rem;font-weight:800;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;margin-top:2px}

	.mh-stats-col{flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0;width:100%}
	
	.mh-stat-dots{display:flex;align-items:center;gap:1.5rem;margin-bottom:1.25rem;width:100%;box-sizing:border-box}
	.sd-item{display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:#94a3b8;font-weight:500;min-width:0}
	.sd-item b{color:var(--page-text,#fff);font-weight:700}
	.sd{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}
	@media (max-width: 640px) {
		.mh-stat-dots {
			gap: 0.25rem;
			margin-bottom: 0.85rem;
			justify-content: space-between;
		}
		.sd-item {
			font-size: 0.62rem;
			gap: 0.2rem;
			flex: 1 1 0;
			min-width: 0;
			justify-content: center;
			text-align: center;
			line-height: 1.2;
		}
		.sd-item .sd {
			width: 7px;
			height: 7px;
		}
	}
	@media (max-width: 380px) {
		.mh-stat-dots .sd-item {
			font-size: 0.56rem;
			gap: 0.15rem;
		}
	}
	.sd.green{background:#10b981;box-shadow:0 0 10px rgba(16,185,129,0.3)}
	.sd.red{background:#f43f5e;box-shadow:0 0 10px rgba(244,63,94,0.3)}
	.sd.gray{background:rgba(255,255,255,0.35)}

	.mh-seg-bar{display:flex;height:10px;border-radius:5px;overflow:hidden;margin-bottom:2rem;background:var(--analysis-card-border,#1e293b)}
	.mh-seg{height:100%;transition:width 1.2s cubic-bezier(0.4, 0, 0.2, 1)}
	.mh-seg.green{background:#10b981} .mh-seg.red{background:#f43f5e} .mh-seg.dark{background:rgba(255,255,255,0.18)}

	.mh-kpi-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:1.25rem}
	@media(max-width:550px){.mh-kpi-grid{grid-template-columns:repeat(2, 1fr)}}
	.mh-kpi{background:rgba(255,255,255,0.02);padding:1.25rem;border-radius:16px;display:flex;flex-direction:column;gap:0.4rem;border:1px solid rgba(255,255,255,0.03);transition:all 0.2s}
	.mh-kpi:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.08)}
	.mh-kpi-lbl{display:flex;align-items:center;gap:0.5rem;font-size:0.65rem;color:#64748b;font-weight:800;letter-spacing:0.08em;text-transform:uppercase}
	.mh-kpi-lbl svg{stroke:currentColor;opacity:0.5}
	.mh-kpi b{font-size:1.25rem;font-weight:900;color:var(--page-text,#fff);letter-spacing:-0.02em}

	/* Hero card view question button */
	.mh-vq-btn{margin-top:2rem;width:100%;background:#10b981;color:#fff;border:none;border-radius:12px;padding:1rem;font-size:0.9rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:0.75rem;cursor:pointer;transition:all 0.2s}
	.mh-vq-btn:hover{background:#0fa472;transform:translateY(-2px);box-shadow:0 8px 20px rgba(16,185,129,0.3)}
	.mh-vq-btn svg{transition:transform 0.2s}
	.mh-vq-btn:hover svg{transform:translateX(4px)}

	/* White Mode (Light Theme) */
	:global([data-theme="light"]) .m-panel{color:#1e293b} :global([data-theme="light"]) .m-body{background:transparent}
	:global([data-theme="light"]) .m-head-stack {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--color-brand-primary, #4f7eff) 14%, #ffffff) 0%,
			color-mix(in srgb, var(--color-brand-primary, #4f7eff) 8%, #f0f4ff) 100%
		);
		border-bottom: 1px solid
			color-mix(
				in srgb,
				var(--color-brand-primary, #4f7eff) 22%,
				var(--analysis-card-border, #e2e8f0)
			);
	}
	:global([data-theme="light"]) .m-nav-bar {
		border-bottom: 1px solid var(--analysis-card-border, #e2e8f0);
	}
	:global([data-theme="light"]) .m-title {
		color: var(--text-color, #1e293b);
	}
	:global([data-theme="light"]) .m-sub {
		color: #64748b;
		opacity: 0.9;
	}
	:global([data-theme="light"]) .m-back {
		background: rgba(255, 255, 255, 0.85);
		color: #475569;
		border: 1px solid var(--analysis-card-border, #e2e8f0);
	}
	:global([data-theme="light"]) .m-back:hover {
		background: #ffffff;
	}
	:global([data-theme="light"]) .mh-card, :global([data-theme="light"]) .ch-card{background:#f8fafc;border:1px solid #e8edf5;box-shadow:0 4px 20px rgba(0,0,0,0.04)}
	:global([data-theme="light"]) .mh-d-text b{color:#0f172a}
	:global([data-theme="light"]) .sd-item{color:#475569} :global([data-theme="light"]) .sd-item b{color:#0f172a}
	:global([data-theme="light"]) .mh-kpi, :global([data-theme="light"]) .cc-kpi{background:#f8fafc;border-color:#e2e8f0}
	:global([data-theme="light"]) .mh-kpi b, :global([data-theme="light"]) .cc-kpi b, :global([data-theme="light"]) .cc-title{color:#1e293b}
	:global([data-theme="light"]) .m-nav-bar .pill-tab{background:#ffffff;border-color:var(--analysis-card-border,#e2e8f0);color:#475569}
	:global([data-theme="light"]) .m-nav-bar .pill-tab:hover{background:#e8edf5;color:#1e293b;border-color:#cbd5e1}
	:global([data-theme="light"]) .m-nav-bar .pill-tab.active{background:#2563eb;color:#fff;border-color:#3b82f6}
	:global([data-theme="light"]) .mh-circ .mh-bg{stroke:#f1f5f9}

	/* Sub Items Grid */
	.sh-head{display:flex;align-items:center;gap:0.75rem;font-size:1.1rem;font-weight:800;color:#10b981;margin:2rem 0 1.5rem;letter-spacing:-0.01em}
	.sh-badge{background:var(--analysis-card-border,#e2e8f0);color:var(--page-text-muted,#94a3b8);padding:0.15rem 0.6rem;border-radius:12px;font-size:0.75rem;font-weight:700}

	.ch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
	@media(max-width:1024px){.ch-grid{grid-template-columns:repeat(2,1fr)}}
	@media(max-width:640px){.ch-grid{grid-template-columns:1fr}}

	.ch-card{background:var(--analysis-card-bg,#161b26);border:1px solid rgba(255,255,255,0.04);border-radius:20px;padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;cursor:pointer;text-align:left;transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1);width:100%}
	.ch-card:hover{transform:translateY(-5px);background:rgba(255,255,255,0.02);border-color:rgba(16,185,129,0.3);box-shadow:0 15px 35px rgba(0,0,0,0.4)}
	
	.cc-top{display:flex;align-items:center;justify-content:space-between}
	.cc-title{font-size:1.05rem;font-weight:800;color:var(--page-text,#fff);letter-spacing:-0.01em}
	
	.cc-dots{display:flex;align-items:center;gap:1rem}
	.cd-tag{display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:700}
	.cd-tag svg{flex-shrink:0}
	.cd-tag.green{color:#10b981} .cd-tag.red{color:#f43f5e} .cd-tag.gray{color:rgba(255,255,255,0.45)}

	.cc-kpis{display:grid;grid-template-columns:repeat(2, 1fr);gap:1rem}
	.cc-kpi{display:flex;flex-direction:column;gap:0.15rem}
	.cc-kpi-lbl{font-size:0.55rem;color:rgba(255,255,255,0.4);font-weight:800;letter-spacing:0.06em;text-transform:uppercase}
	.cc-kpi b{font-size:0.9rem;font-weight:800;color:var(--page-text,#cbd5e1);letter-spacing:-0.01em}

	/* ── question preview inside modal ── */
	.pv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);z-index:300;cursor:pointer}
	.pv-panel{position:fixed;top:0;right:0;bottom:0;width:min(700px,100vw);background:#0b0f19;z-index:301;display:flex;flex-direction:column;box-shadow:-10px 0 40px rgba(0,0,0,.5);overflow:hidden}
	:global([data-theme="light"]) .pv-panel{background:#fff}
	:global([data-theme="dark"]) .pv-panel{background:#0b0f19}

	.pv-nav{background:#111827;border-bottom:1px solid rgba(255,255,255,0.05);color:#fff;padding:.75rem 1rem;display:flex;flex-direction:column;gap:.5rem;flex-shrink:0}
	:global([data-theme="light"]) .pv-nav{background:#f8fafc;border-color:#e2e8f0;color:#1e293b}
	.pv-nav-top{display:flex;align-items:center}
	.pv-close{background:none;border:none;color:#fff;font-size:.875rem;font-weight:700;cursor:pointer;padding:0;display:flex;align-items:center;gap:.5rem}
	:global([data-theme="light"]) .pv-close{color:#1e293b}

	/* filter tabs */
	.pv-filter-tabs{display:flex;gap:.4rem;flex-wrap:wrap}
	.pv-ftab{padding:.3rem .85rem;border-radius:16px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:rgba(255,255,255,.8);font-size:.72rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s}
	:global([data-theme="light"]) .pv-ftab{background:#f1f5f9;border-color:#e2e8f0;color:#64748b}
	.pv-ftab:hover{background:rgba(255,255,255,.2)}
	:global([data-theme="light"]) .pv-ftab:hover{background:#e2e8f0}
	.pv-ftab.active{background:#fff;color:#1e3a8a;border-color:#fff}
	:global([data-theme="light"]) .pv-ftab.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}
	.pv-ftab.correct.active{background:#22c55e;color:#fff;border-color:#22c55e}
	.pv-ftab.wrong.active{background:#ef4444;color:#fff;border-color:#ef4444}
	.pv-ftab.skip.active{background:#94a3b8;color:#fff;border-color:#94a3b8}
	.pv-nums{display:flex;gap:.35rem;flex-wrap:wrap;max-height:90px;overflow-y:auto;padding-top:.25rem}
	.pv-num{width:32px;height:32px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-size:.75rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center}
	:global([data-theme="light"]) .pv-num{background:#f8fafc;border-color:#e2e8f0;color:#64748b}
	.pv-num.active{background:#fff;color:#1e3a8a}
	:global([data-theme="light"]) .pv-num.active{background:#1e3a8a;color:#fff;border-color:#1e3a8a}
	.pv-num:hover:not(.active){background:rgba(255,255,255,.2)}
	:global([data-theme="light"]) .pv-num:hover:not(.active){background:#e2e8f0}

	.pv-body{flex:1;overflow-y:auto;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:1rem}
	.pv-meta{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
	.pv-qnum{width:32px;height:32px;border-radius:50%;background:#64748b;color:#fff;font-size:.875rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
	.pv-times{font-size:.75rem;color:#64748b;display:flex;align-items:center;gap:.4rem}
	.pv-sep{opacity:.4}
	.pv-badge{background:#eff6ff;color:#3b82f6;border-radius:4px;padding:.2rem .6rem;font-size:.7rem;font-weight:700}
	.pv-status{margin-left:auto;display:flex;align-items:center}
	.pv-answer-label{font-size:.75rem;font-weight:700;letter-spacing:.02em;white-space:nowrap}
	.pv-answer-correct{color:#22c55e}.pv-answer-wrong{color:#ef4444}.pv-answer-skip{color:#94a3b8}

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

	/* Dark-mode polish: keep copy white and use bluish surfaces in analysis modals. */
	:global([data-theme="dark"]) .aa-card b,
	:global([data-theme="dark"]) .aa-card p,
	:global([data-theme="dark"]) .mh-d-text span,
	:global([data-theme="dark"]) .sd-item,
	:global([data-theme="dark"]) .mh-kpi-lbl,
	:global([data-theme="dark"]) .cc-kpi-lbl,
	:global([data-theme="dark"]) .pf-count,
	:global([data-theme="dark"]) .pv-times {
		color: #e2e8f0;
	}
	:global([data-theme="dark"]) .m-panel {
		background: linear-gradient(180deg, #0b1022 0%, #0a122a 100%);
	}
	:global([data-theme="dark"]) .m-head-stack {
		background: linear-gradient(
			118deg,
			color-mix(
					in srgb,
					var(--color-brand-primary, #4f7eff) 38%,
					#050810
				)
				0%,
			color-mix(
					in srgb,
					var(--color-brand-primary, #4f7eff) 26%,
					#0a1020
				)
				50%,
			#0b1428 100%
		);
		border-bottom: 1px solid
			color-mix(
				in srgb,
				var(--color-brand-primary, #4f7eff) 42%,
				transparent
			);
	}
	:global([data-theme="dark"]) .m-nav-bar {
		border-top: none;
		border-bottom: 1px solid
			color-mix(
				in srgb,
				var(--analysis-card-border, rgba(79, 126, 255, 0.22)) 70%,
				transparent
			);
	}
	:global([data-theme="dark"]) .m-title {
		color: #ffffff;
	}
	:global([data-theme="dark"]) .m-sub {
		color: rgba(255, 255, 255, 0.9);
		opacity: 1;
	}
	:global([data-theme="dark"]) .mh-kpi b,
	:global([data-theme="dark"]) .mh-d-text b,
	:global([data-theme="dark"]) .cc-kpi b {
		color: #ffffff;
	}
	:global([data-theme="dark"]) .mh-kpi,
	:global([data-theme="dark"]) .ch-card {
		background: #18243a;
		border-color: rgba(96, 165, 250, 0.2);
	}
	:global([data-theme="dark"]) .cc-title {
		color: #ffffff;
	}
	:global([data-theme="dark"]) .pv-panel {
		background: linear-gradient(180deg, #0b1022 0%, #0a122a 100%);
	}
	:global([data-theme="dark"]) .pv-nav {
		background: color-mix(in srgb, var(--color-brand-primary, #4f7eff) 50%, #0f172a);
		border-bottom-color: color-mix(
			in srgb,
			var(--color-brand-primary, #4f7eff) 36%,
			transparent
		);
	}
	:global([data-theme="dark"]) .pv-num {
		background: rgba(255, 255, 255, 0.14);
		border-color: color-mix(
			in srgb,
			var(--color-brand-primary, #4f7eff) 34%,
			rgba(255, 255, 255, 0.28)
		);
		color: #f8fafc;
	}
	:global([data-theme="dark"]) .pv-num.active {
		background: var(--color-brand-primary, #4f7eff);
		border-color: var(--color-brand-primary, #4f7eff);
		color: #fff;
	}
	:global([data-theme="dark"]) .pv-badge {
		background: color-mix(
			in srgb,
			var(--analysis-tab-active, var(--page-link)) 22%,
			transparent
		);
		border: 1px solid
			color-mix(
				in srgb,
				var(--analysis-tab-active, var(--page-link)) 46%,
				transparent
			);
		color: color-mix(in srgb, var(--analysis-tab-active, var(--page-link)) 62%, #ffffff);
	}
	:global([data-theme="dark"]) .pv-qtext {
		background: #1a2740;
		border-color: color-mix(
			in srgb,
			var(--analysis-tab-active, var(--page-link)) 30%,
			transparent
		);
		color: #f8fafc;
	}
	:global([data-theme="dark"]) .pv-opt {
		background: #18243a;
		border-color: color-mix(
			in srgb,
			var(--analysis-tab-active, var(--page-link)) 30%,
			transparent
		);
		color: #f8fafc;
	}
	:global([data-theme="dark"]) .pv-opt.opt-correct {
		background: rgba(22, 163, 74, 0.18);
		border-color: rgba(34, 197, 94, 0.5);
		color: #ecfdf5;
	}
	:global([data-theme="dark"]) .pv-opt.opt-wrong {
		background: rgba(220, 38, 38, 0.18);
		border-color: rgba(248, 113, 113, 0.5);
		color: #fef2f2;
	}
	:global([data-theme="dark"]) .pv-footer {
		border-top-color: color-mix(
			in srgb,
			var(--analysis-tab-active, var(--page-link)) 30%,
			transparent
		);
	}
	:global([data-theme="dark"]) .pf.prev {
		background: rgba(148, 163, 184, 0.22);
		color: #f8fafc;
	}
</style>
