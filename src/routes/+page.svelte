<script lang="ts">
  import { goto } from '$app/navigation';
  import { fade, fly, slide } from 'svelte/transition';
  import { onMount } from 'svelte';

  // --- STATE ---
  let isOpen = $state(false);

  // --- CONSTANTS ---
  const NAV_LINKS = [
    { label: "App Screenshots", href: "#screenshots" },
    { label: "For Students", href: "#students" },
    { label: "For Teachers", href: "#teachers" },
    { label: "How It Works", href: "#how-it-works" },
  ];

  // --- HELPERS ---
  const handleLogin = () => goto('/login');

  // SVGs for Icons
  const Icons = {
    Zap: `<path d="M13 2L3 14h9l-1 8L21 10h-9l1-8z"/>`,
    Menu: `<path d="M4 6h16M4 12h16M4 18h16"/>`,
    X: `<path d="M18 6L6 18M6 6l12 12"/>`,
    ArrowRight: `<path d="M5 12h14M12 5l7 7-7 7"/>`,
    TrendingUp: `<path d="M22 7l-8.5 8.5-5-5L2 17M16 7h6v6"/>`,
    FileText: `<path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2zM14 2v6h6"/>`,
    Check: `<path d="M20 6L9 17l-5-5"/>`,
    Brain: `<path d="M12 2a3 3 0 00-3 3c0 2 1.5 3 3 4s3 2 3 4a3 3 0 01-6 0M12 2a3 3 0 013 3c0 2-1.5 3-3 4s-3 2-3 4a3 3 0 006 0"/>`, // Simplified Brain
    BookOpen: `<path d="M2 3h6a4 4 0 014 4v14a4 4 0 00-4-4H2zM22 3h-6a4 4 0 00-4 4v14a4 4 0 014-4h6z"/>`,
    BarChart3: `<path d="M18 20V10M12 20V4M6 20v-6"/>`,
    Smartphone: `<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><path d="M12 18h.01"/>`,
    GraduationCap: `<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5v-5"/>`,
    Building2: `<path d="M7 21v-4a2 2 0 012-2h6a2 2 0 012 2v4M3 21h18M3 7l9-4 9 4M5 21V7m14 14V7"/>`,
    Target: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    Database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
    CheckSquare: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 11l3 3L22 4"/>`,
    Palette: `<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H17c2.8 0 5-2.2 5-5 0-5.5-4.5-10-10-10z"/>`,
    UserPlus: `<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>`
  };
</script>

<svelte:head>
  <title>QuizNova — India's Most Advanced Exam Platform</title>
  <meta name="description" content="AI-powered practice tests, smart analytics, and instant question paper generation for JEE, NEET, UPSC & more."/>
</svelte:head>

<div class="landing-page min-h-screen bg-[#0a0a0c] text-[#f2f2f5] font-sans selection:bg-[oklch(0.62_0.26_293_/_0.3)]">
  
  <!-- NAVBAR -->
  <nav class="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-background/70 backdrop-blur-2xl">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-primary-foreground">
            {@html Icons.Zap}
          </svg>
        </div>
        <span class="text-lg font-black tracking-tight">
          Quiz<span class="text-primary">Nova</span>
        </span>
      </a>

      <div class="hidden md:flex items-center gap-7">
        {#each NAV_LINKS as link}
          <a href={link.href} class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
            {link.label}
          </a>
        {/each}
      </div>

      <div class="hidden md:flex items-center gap-3">
        <button onclick={handleLogin} class="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          Sign In
        </button>
        <button onclick={handleLogin} class="px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer">
          Get Started
        </button>
      </div>

      <button class="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors" onclick={() => isOpen = !isOpen} aria-label="Toggle menu">
        {#if isOpen}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{@html Icons.X}</svg>
        {:else}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{@html Icons.Menu}</svg>
        {/if}
      </button>
    </div>

    {#if isOpen}
      <div transition:slide={{ duration: 300 }} class="md:hidden border-t border-white/[0.05] bg-background/95 backdrop-blur-xl overflow-hidden">
        <div class="px-6 py-4 space-y-1">
          {#each NAV_LINKS as link}
            <a href={link.href} class="block py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" onclick={() => isOpen = false}>
              {link.label}
            </a>
          {/each}
          <div class="pt-3 flex flex-col gap-2">
            <button onclick={() => { handleLogin(); isOpen = false; }} class="w-full text-left py-2.5 text-sm font-semibold text-muted-foreground cursor-pointer">Sign In</button>
            <button onclick={() => { handleLogin(); isOpen = false; }} class="w-full py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg text-center cursor-pointer">Get Started</button>
          </div>
        </div>
      </div>
    {/if}
  </nav>

  <main>
    <!-- HERO SECTION -->
    <section class="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div class="absolute inset-0 opacity-[0.035] pointer-events-none" style="background-image: radial-gradient(circle, oklch(0.95 0 0) 1px, transparent 1px); background-size: 32px 32px;"></div>
      <div class="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_top_right,oklch(0.62_0.26_293_/_0.18)_0%,transparent_65%)] pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.62_0.26_293_/_0.07)_0%,transparent_60%)] pointer-events-none"></div>
      
      <div class="max-w-7xl mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
        <div in:fly={{ y: 28, duration: 550, delay: 100 }}>
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold mb-8">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span class="text-primary">India's Most Advanced Exam Platform</span>
          </div>
          <h1 class="text-5xl lg:text-[4.2rem] font-black tracking-tight leading-[1.06] mb-8">
            Crack Every<br />
            <span class="bg-gradient-to-r from-primary via-[oklch(0.7_0.2_310)] to-[oklch(0.75_0.17_78)] bg-clip-text text-transparent">Competitive</span><br />
            Exam. Period.
          </h1>
          <p class="text-muted-foreground text-lg leading-relaxed max-w-md mb-8">AI-powered practice tests, smart analytics, and instant question paper generation — built for students aiming at JEE, NEET, UPSC & more.</p>
          
          <div class="flex flex-wrap gap-4 mb-12">
            <button onclick={handleLogin} class="h-12 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 rounded-xl px-7 text-sm font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer">
              Student Dashboard <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html Icons.ArrowRight}</svg>
            </button>
            <button onclick={handleLogin} class="h-12 border border-white/10 flex items-center gap-2 rounded-xl px-7 text-sm font-bold hover:bg-secondary transition-all cursor-pointer">
              Teacher Dashboard <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html Icons.ArrowRight}</svg>
            </button>
          </div>

          <div class="flex items-center gap-8 pt-4 border-t border-white/10">
            {#each [{ value: "50k+", label: "Students" }, { value: "2k+", label: "Teachers" }, { value: "100k+", label: "Papers" }] as stat, i}
              <div class="flex items-center gap-8">
                {#if i > 0}<div class="w-px h-8 bg-white/10"></div>{/if}
                <div>
                  <div class="text-2xl font-black text-foreground">{stat.value}</div>
                  <div class="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Hero Mockup Side -->
        <div class="relative hidden lg:flex items-center justify-center" in:fly={{ x: 32, duration: 550, delay: 280 }}>
          <div class="relative w-full max-w-[340px] bg-card border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40">
            <div class="flex items-center justify-between mb-5">
              <div>
                <p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live Mock Test</p>
                <h3 class="text-lg font-bold mt-0.5">Physics — JEE Advanced</h3>
              </div>
              <span class="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-bold border border-green-500/25">LIVE</span>
            </div>
            
            <div class="flex items-center gap-5 mb-6 pb-5 border-b border-white/5">
              <div class="relative w-[88px] h-[88px] shrink-0">
                <svg viewBox="0 0 100 100" class="w-[88px] h-[88px] -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke-width="11" stroke="oklch(0.2 0.02 265)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke-width="11" stroke="oklch(0.62 0.26 293)" stroke-dasharray="186 65" stroke-linecap="round" />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-black">74%</span>
                  <span class="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Score</span>
                </div>
              </div>
              <div class="space-y-2.5 flex-1">
                {#each [{ label: "Correct", val: 37, color: "bg-green-400" }, { label: "Wrong", val: 9, color: "bg-red-500" }, { label: "Skipped", val: 4, color: "bg-muted-foreground" }] as item}
                  <div class="flex items-center gap-2 text-sm">
                    <div class="w-2 h-2 rounded-full {item.color}"></div>
                    <span class="text-muted-foreground flex-1">{item.label}</span>
                    <span class="font-bold">{item.val}</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="space-y-3">
              {#each [{ topic: "Mechanics", pct: 88 }, { topic: "Thermodynamics", pct: 62 }, { topic: "Electrostatics", pct: 45 }] as item}
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs">
                    <span class="text-muted-foreground font-medium">{item.topic}</span>
                    <span class="font-bold">{item.pct}%</span>
                  </div>
                  <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-primary rounded-full" style="width: {item.pct}%"></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Floating Badges -->
          <div class="absolute -left-10 top-12 bg-card border border-white/10 rounded-2xl px-4 py-3 shadow-xl shadow-black/30 flex items-center gap-3 animate-float">
            <div class="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.66 0.18 154)" stroke-width="2">{@html Icons.TrendingUp}</svg>
            </div>
            <div>
              <p class="text-[10px] text-muted-foreground font-medium">All India Rank</p>
              <p class="font-black text-green-400 text-sm">#342 (+806)</p>
            </div>
          </div>
          <div class="absolute -right-8 bottom-14 bg-card border border-white/10 rounded-2xl px-4 py-3 shadow-xl shadow-black/30 flex items-center gap-3 animate-float-delayed">
            <div class="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">{@html Icons.FileText}</svg>
            </div>
            <div>
              <p class="text-[10px] text-muted-foreground font-medium">Papers Generated</p>
              <p class="font-black text-sm">100k+ today</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- STATS BAR -->
    <section class="py-0">
      <div class="bg-secondary/60 border-y border-white/5">
        <div class="max-w-7xl mx-auto px-6">
          <div class="grid grid-cols-2 md:grid-cols-4">
            {#each [{ value: "50k+", label: "Active Students", color: "text-primary" }, { value: "2k+", label: "Expert Teachers", color: "text-[oklch(0.75_0.17_78)]" }, { value: "100k+", label: "Papers Generated", color: "text-primary" }, { value: "25k+", label: "Daily Exams Taken", color: "text-[oklch(0.75_0.17_78)]" }] as stat, i}
              <div class="py-10 px-6 text-center relative border-white/5 {i > 0 ? 'md:border-l' : ''} {i % 2 !== 0 ? 'border-l md:border-l-0' : ''}">
                <div class="text-4xl lg:text-5xl font-black mb-2 {stat.color}">{stat.value}</div>
                <div class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <!-- APP SCREENSHOTS -->
    <section id="screenshots" class="py-24 scroll-mt-16 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-20" in:fade>
          <p class="text-sm font-bold text-primary uppercase tracking-[0.15em] mb-3">See It In Action</p>
          <h2 class="text-4xl lg:text-5xl font-black tracking-tight mb-4">Beautifully Designed.<br /><span class="bg-gradient-to-r from-primary to-[oklch(0.75_0.17_78)] bg-clip-text text-transparent">Ridiculously Powerful.</span></h2>
          <p class="text-muted-foreground text-lg max-w-md mx-auto">Every screen crafted to make exam preparation effortless for students and paper creation instant for teachers.</p>
        </div>
        
        <div class="flex items-end justify-center gap-6 lg:gap-12 pb-12">
          <!-- Phone 1: Practice Test -->
          <div class="hidden sm:flex flex-col items-center gap-4" style="transform: rotate(-7deg) scale(0.88); transform-origin: center bottom;">
            <div class="relative w-[235px] h-[490px] bg-[oklch(0.1_0.025_265)] rounded-[44px] border-[5px] border-[oklch(0.22_0.03_265)] shadow-2xl shadow-black/60 overflow-hidden">
              <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-[88px] h-[22px] bg-[oklch(0.07_0.02_265)] rounded-full z-20"></div>
              <div class="absolute inset-0 bg-background overflow-hidden pt-11 pb-4 px-4 py-3">
                <div class="flex items-center justify-between mb-3"><span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Physics MCQ</span><span class="text-[11px] font-black text-primary bg-primary/15 px-2 py-0.5 rounded-full">32:45</span></div>
                <div class="mb-3">
                    <div class="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Q.24 of 50</span><span>48% done</span></div>
                    <div class="h-1 bg-white/5 rounded-full"><div class="h-full bg-primary rounded-full" style="width: 48%"></div></div>
                </div>
                <div class="bg-secondary/50 rounded-2xl p-3 mb-3"><p class="text-[11px] leading-relaxed font-medium">A body of mass 2 kg moves with velocity 10 m/s. The kinetic energy is:</p></div>
                <div class="space-y-2">
                    {#each ["50 J", "100 J", "200 J", "25 J"] as opt, i}
                        <div class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold border {i === 1 ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-secondary/40 border-white/5 text-muted-foreground'}">
                            <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[9px] shrink-0 font-bold">{String.fromCharCode(65+i)}</span>{opt}
                        </div>
                    {/each}
                </div>
              </div>
            </div>
            <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Practice Test</span>
          </div>

          <!-- Phone 2: Analytics (Center) -->
          <div class="flex flex-col items-center gap-4" style="transform: scale(1); transform-origin: center bottom;">
            <div class="relative w-[235px] h-[490px] bg-[oklch(0.1_0.025_265)] rounded-[44px] border-[5px] border-[oklch(0.22_0.03_265)] shadow-2xl shadow-black/60 overflow-hidden">
              <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-[88px] h-[22px] bg-[oklch(0.07_0.02_265)] rounded-full z-20"></div>
              <div class="absolute inset-0 bg-background overflow-hidden pt-11 pb-4 px-4 py-3">
                <div class="mb-3"><p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Performance</p><h3 class="text-base font-black">Your Progress</h3></div>
                <div class="flex items-center gap-3 mb-4 p-3 bg-primary/10 border border-primary/25 rounded-2xl">
                    <div class="relative w-14 h-14 shrink-0">
                        <svg viewBox="0 0 100 100" class="w-14 h-14 -rotate-90">
                            <circle cx="50" cy="50" r="38" fill="none" stroke-width="14" stroke="oklch(0.2 0.02 265)" />
                            <circle cx="50" cy="50" r="38" fill="none" stroke-width="14" stroke="oklch(0.62 0.26 293)" stroke-dasharray="186 65" stroke-linecap="round" />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center"><span class="text-sm font-black">74%</span></div>
                    </div>
                    <div><p class="text-[10px] text-muted-foreground">Overall Score</p><p class="text-xl font-black text-primary">74%</p></div>
                </div>
                <div class="space-y-3">
                    {#each [{name:'Physics', pct:88, color:'bg-primary'}, {name:'Chemistry', pct:71, color:'bg-[oklch(0.75_0.17_78)]'}] as s}
                        <div><div class="flex justify-between text-[10px] mb-1"><span class="font-semibold text-muted-foreground">{s.name}</span><span class="font-black">{s.pct}%</span></div><div class="h-1.5 bg-white/5 rounded-full overflow-hidden"><div class="h-full {s.color} rounded-full" style="width: {s.pct}%"></div></div></div>
                    {/each}
                </div>
              </div>
            </div>
            <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Analytics</span>
          </div>

          <!-- Phone 3: Paper Builder -->
          <div class="hidden sm:flex flex-col items-center gap-4" style="transform: rotate(7deg) scale(0.88); transform-origin: center bottom;">
            <div class="relative w-[235px] h-[490px] bg-[oklch(0.1_0.025_265)] rounded-[44px] border-[5px] border-[oklch(0.22_0.03_265)] shadow-2xl shadow-black/60 overflow-hidden">
              <div class="absolute top-3.5 left-1/2 -translate-x-1/2 w-[88px] h-[22px] bg-[oklch(0.07_0.02_265)] rounded-full z-20"></div>
              <div class="absolute inset-0 bg-background overflow-hidden pt-11 pb-4 px-4 py-3">
                <div class="mb-3"><p class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teacher Tools</p><h3 class="text-base font-black">Paper Builder</h3></div>
                <div class="p-3 bg-secondary/50 rounded-2xl mb-3 border border-white/5"><p class="text-[11px] font-bold mb-0.5">Physics — JEE Advanced</p><div class="flex gap-3 text-[10px] text-muted-foreground"><span>45 Qs</span><span>90 Min</span></div></div>
                <div class="space-y-1.5">
                    {#each ['Mechanics', 'Optics', 'Electrostatics'] as ch}
                        <div class="flex items-center justify-between px-3 py-2 bg-secondary/30 rounded-xl border border-white/5"><span class="text-[10px] font-semibold">{ch}</span><span class="text-[10px] font-black text-primary">12 Q</span></div>
                    {/each}
                </div>
              </div>
            </div>
            <span class="text-xs font-bold text-muted-foreground uppercase tracking-widest">Paper Builder</span>
          </div>
        </div>
        <div class="flex justify-center mt-8 cursor-default"><div class="w-[600px] h-16 bg-primary/20 blur-3xl rounded-full"></div></div>
      </div>
    </section>

    <!-- STUDENT BENEFITS -->
    <section id="students" class="py-24 scroll-mt-16">
      <div class="max-w-7xl mx-auto px-6">
        <div class="mb-12">
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-bold mb-5">For Students</span>
            <div class="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
                <h2 class="text-4xl lg:text-5xl font-black tracking-tight leading-tight">Every Tool You Need<br /><span class="bg-gradient-to-r from-primary to-[oklch(0.75_0.17_78)] bg-clip-text text-transparent">to Rank in the Top 1%</span></h2>
                <p class="text-muted-foreground text-base max-w-xs lg:text-right">From personalized practice to rank prediction — QuizNova gives you the edge that toppers rely on.</p>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2 bg-card border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-primary/40 transition-colors duration-300">
                <div class="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-transparent pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="flex items-start gap-4 mb-2"><div class="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">{@html Icons.Brain}</svg></div><div><h3 class="text-xl font-black">AI-Powered Mock Tests</h3><p class="text-muted-foreground text-sm mt-1 leading-relaxed">Full-length adaptive exams that mirror the actual JEE/NEET pattern. Our AI analyzes your weak areas and generates targeted sessions.</p></div></div>
                    <div class="bg-background/80 border border-white/5 rounded-2xl p-4 mt-5">
                        <div class="flex items-center justify-between mb-3"><span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Q.24 of 50</span><span class="text-[10px] font-black text-primary bg-primary/15 px-2 py-0.5 rounded-full">32:45</span></div>
                        <p class="text-xs font-medium text-foreground mb-3 leading-relaxed">A body of mass 2 kg moves with velocity 10 m/s. Calculate its kinetic energy.</p>
                        <div class="space-y-1.5">
                            {#each ["50 J", "100 J", "200 J", "25 J"] as opt, i}
                                <div class="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold border {i === 1 ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-secondary/40 border-white/5 text-muted-foreground'}">
                                    <span class="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px] shrink-0">{String.fromCharCode(65+i)}</span>{opt}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
            {#each [
                { icon: Icons.BookOpen, title: "Chapter-wise Practice", desc: "Drill any chapter, any topic, at any difficulty.", iconBg: "bg-[oklch(0.75_0.17_78_/_0.2)] text-[oklch(0.75_0.17_78)]" },
                { icon: Icons.TrendingUp, title: "Rank Predictor", desc: "Know your All India Rank before the actual exam day.", iconBg: "bg-green-500/20 text-green-400" }
            ] as card}
                <div class="bg-card border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-primary/40 transition-colors duration-300">
                    <div class="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 {card.iconBg}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html card.icon}</svg></div>
                    <h3 class="text-base font-black mb-2">{card.title}</h3>
                    <p class="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
                </div>
            {/each}
        </div>
      </div>
    </section>

    <!-- TEACHER BENEFITS -->
    <section id="teachers" class="py-24 scroll-mt-16 bg-secondary/15">
      <div class="max-w-7xl mx-auto px-6">
        <div class="mb-12">
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.75_0.17_78_/_0.15)] border border-[oklch(0.75_0.17_78_/_0.35)] text-[oklch(0.75_0.17_78)] text-sm font-bold mb-5">For Teachers</span>
            <div class="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
                <h2 class="text-4xl lg:text-5xl font-black tracking-tight leading-tight">Create. Share. Analyze.<br /><span class="bg-gradient-to-r from-[oklch(0.75_0.17_78)] to-[oklch(0.7_0.22_30)] bg-clip-text text-transparent">All from One Place.</span></h2>
                <p class="text-muted-foreground text-base max-w-xs lg:text-right">Spend less time building papers. More time inspiring the next generation of toppers.</p>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2 bg-card border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-[oklch(0.75_0.17_78_/_0.4)] transition-colors duration-300">
                <div class="absolute inset-0 bg-gradient-to-bl from-[oklch(0.75_0.17_78_/_0.12)] via-transparent to-transparent pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="flex items-start gap-4 mb-2"><div class="w-12 h-12 rounded-2xl bg-[oklch(0.75_0.17_78_/_0.2)] flex items-center justify-center shrink-0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html Icons.FileText}</svg></div><div><h3 class="text-xl font-black">Smart Paper Builder</h3><p class="text-muted-foreground text-sm mt-1 leading-relaxed">Generate complete question papers in under 2 minutes. Choose chapters, set difficulty, and export instantly.</p></div></div>
                    <div class="bg-background/80 border border-white/5 rounded-2xl p-4 mt-5">
                        <div class="flex items-center justify-between mb-3"><div><p class="text-[11px] font-black">Physics — JEE 2024</p><p class="text-[10px] text-muted-foreground">45 Qs · 90 min</p></div><span class="text-[9px] px-2 py-1 rounded-full bg-primary/15 text-primary font-bold border border-primary/25">Draft</span></div>
                        <div class="space-y-1.5 mb-3">
                            {#each ["Mechanics", "Thermodynamics"] as ch}
                                <div class="flex items-center justify-between px-3 py-2 bg-secondary/40 rounded-lg border border-white/5"><span class="text-[10px] font-semibold">{ch}</span><span class="text-[10px] font-black text-primary">12 Q</span></div>
                            {/each}
                        </div>
                        <button class="w-full py-2 rounded-xl bg-primary text-[11px] font-black text-primary-foreground">Generate PDF Paper</button>
                    </div>
                </div>
            </div>
            {#each [
                { icon: Icons.Database, title: "500k+ Question Bank", desc: "Massive, well-categorized question bank across all subjects.", iconBg: "bg-[oklch(0.75_0.17_78_/_0.2)] text-[oklch(0.75_0.17_78)]" },
                { icon: Icons.CheckSquare, title: "Auto Grading", desc: "Automated evaluation with per-student breakdowns.", iconBg: "bg-green-500/20 text-green-400" }
            ] as card}
                <div class="bg-card border border-white/10 rounded-3xl p-6 relative overflow-hidden group hover:border-primary/40 transition-colors duration-300">
                    <div class="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 {card.iconBg}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html card.icon}</svg></div>
                    <h3 class="text-base font-black mb-2">{card.title}</h3>
                    <p class="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
                </div>
            {/each}
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section id="how-it-works" class="py-24 scroll-mt-16 bg-secondary/30">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-16" in:fade>
                <p class="text-sm font-bold text-primary uppercase tracking-[0.15em] mb-3">Get Started</p>
                <h2 class="text-4xl lg:text-5xl font-black tracking-tight mb-4">Up and Running in <span class="bg-gradient-to-r from-primary to-[oklch(0.75_0.17_78)] bg-clip-text text-transparent">3 Steps</span></h2>
            </div>
            <div class="relative grid md:grid-cols-3 gap-8">
                <div class="absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary/40 via-[oklch(0.75_0.17_78_/_0.4)] to-green-400/40 hidden md:block"></div>
                {#each [
                    { number: "01", icon: Icons.UserPlus, title: "Create Your Account", desc: "Sign up as a student or teacher in under 60 seconds.", color: "text-primary border-primary/40 bg-primary/10" },
                    { number: "02", icon: Icons.Target, title: "Choose Your Goal", desc: "Students pick their target exam; teachers connect their institute.", color: "text-[oklch(0.75_0.17_78)] border-[oklch(0.75_0.17_78_/_0.4)] bg-[oklch(0.75_0.17_78_/_0.1)]" },
                    { number: "03", icon: Icons.TrendingUp, title: "Practice & Dominate", desc: "Take AI-powered tests, track your rank, and watch performance skyrocket.", color: "text-green-400 border-green-400/40 bg-green-400/10" }
                ] as step, i}
                    <div class="relative flex flex-col items-center text-center" in:fly={{ y: 24, duration: 500, delay: i * 100 }}>
                        <div class="relative z-10 w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-6 shadow-xl {step.color}">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html step.icon}</svg>
                            <span class="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-background border border-white/10 text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                        </div>
                        <h3 class="text-xl font-black mb-3">{step.title}</h3>
                        <p class="text-muted-foreground text-sm leading-relaxed max-w-xs">{step.desc}</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- TRUSTED BY (MARQUEE) -->
    <section class="py-20 bg-secondary/20 overflow-hidden border-y border-white/5">
        <div class="max-w-7xl mx-auto px-6 mb-12 text-center">
            <p class="text-sm font-bold text-muted-foreground uppercase tracking-[0.15em]">Trusted by 100+ Training Institutes Across India</p>
        </div>
        <div class="flex gap-4 w-max animate-marquee">
            {#each [...Array(2)] as _}
                <div class="flex gap-4">
                    {#each ["Brilliant Study Centre", "Nalanda Academy", "Vidya Coaching", "Apex Tutorials", "Sri Chaitanya", "Resonance Kota", "Allen Career", "Fiitjee Delhi"] as name}
                        <div class="shrink-0 px-6 py-3 rounded-xl bg-card border border-white/5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">{name}</div>
                    {/each}
                </div>
            {/each}
        </div>
    </section>

    <!-- TRIPLE CTA SECTION -->
    <section class="py-24 bg-secondary/20">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-14" in:fade>
          <h2 class="text-4xl lg:text-5xl font-black tracking-tight mb-4 text-foreground">Choose Your Path</h2>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {#each [
            { id: "student", badge: "For Students", icon: Icons.GraduationCap, headline: "Ace every exam with AI-powered precision", features: ["Full-length AI mock tests", "500k+ practice questions", "Real-time analytics"], cta: "Join as Student", btnClass: "bg-primary text-primary-foreground", iconBg: "bg-primary/20 text-primary" },
            { id: "teacher", badge: "For Teachers", icon: Icons.BookOpen, headline: "Build exam papers in minutes, not hours", features: ["Smart paper builder", "Automated grading", "Custom branding"], cta: "Join as Teacher", btnClass: "bg-[oklch(0.75_0.17_78)] text-[oklch(0.1_0_0)]", iconBg: "bg-[oklch(0.75_0.17_78_/_0.2)] text-[oklch(0.75_0.17_78)]" },
            { id: "institute", badge: "For Institutes", icon: Icons.Building2, headline: "Scale to 10,000+ students effortlessly", features: ["Multi-batch management", "Full white-label branding", "Fee tracking"], cta: "Join as Institute", btnClass: "bg-green-500 text-black", iconBg: "bg-green-500/20 text-green-400" }
          ] as p, i}
            <div 
              in:fly={{ y: 24, duration: 500, delay: i * 100 }}
              class="bg-card border-2 border-white/5 hover:border-primary/40 rounded-3xl p-8 flex flex-col group transition-all"
            >
              <div class="flex items-center justify-between mb-6">
                <span class="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 text-foreground border border-white/5">{p.badge}</span>
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center {p.iconBg}">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html p.icon}</svg>
                </div>
              </div>
              <h3 class="text-2xl font-black mb-6 leading-tight flex-1">{p.headline}</h3>
              <ul class="space-y-3 mb-8">
                {#each p.features as f}
                  <li class="flex items-center gap-3 text-sm text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3">{@html Icons.Check}</svg>
                    {f}
                  </li>
                {/each}
              </ul>
              <button onclick={handleLogin} class="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-black transition-all cursor-pointer {p.btnClass}">
                {p.cta} <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">{@html Icons.ArrowRight}</svg>
              </button>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="bg-secondary/40 border-t border-white/5 py-14">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row justify-between items-start gap-10">
          <div class="space-y-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-primary-foreground">{@html Icons.Zap}</svg>
              </div>
              <span class="text-lg font-black tracking-tight">Quiz<span class="text-primary">Nova</span></span>
            </div>
            <p class="text-sm text-muted-foreground max-w-xs">Making exam preparation smarter for students and paper creation effortless for teachers.</p>
          </div>
          <div class="grid grid-cols-2 gap-12">
            <div>
              <h4 class="font-black text-xs uppercase tracking-wider mb-4 opacity-50">Content</h4>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li><a href="#students" class="hover:text-primary transition-colors">Students</a></li>
                <li><a href="#teachers" class="hover:text-primary transition-colors">Teachers</a></li>
                <li><a href="#how-it-works" class="hover:text-primary transition-colors">How it works</a></li>
              </ul>
            </div>
            <div>
              <h4 class="font-black text-xs uppercase tracking-wider mb-4 opacity-50">Company</h4>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="cursor-pointer hover:text-primary transition-colors">Privacy</li>
                <li class="cursor-pointer hover:text-primary transition-colors">Terms</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="pt-8 mt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} QuizNova. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

  :root {
    --primary: oklch(0.62 0.26 293);
    --primary-foreground: oklch(0.97 0 0);
    --secondary: oklch(0.18 0.025 265);
    --foreground: oklch(0.95 0.005 265);
    --background: oklch(0.10 0.02 265);
    --card: oklch(0.14 0.022 265);
    --muted: oklch(0.2 0.02 265);
    --muted-foreground: oklch(0.58 0.015 265);
    --border: oklch(0.24 0.028 265);
    --ring: oklch(0.62 0.26 293);
    --radius: 0.75rem;
  }

  :global(body) {
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    background-color: var(--background);
    color: var(--foreground);
    overflow-x: hidden;
  }

  :global(button) {
    cursor: pointer;
  }

  .text-primary { color: var(--primary); }
  .bg-primary { background-color: var(--primary); }
  .text-primary-foreground { color: var(--primary-foreground); }
  .text-muted-foreground { color: var(--muted-foreground); }
  .bg-background { background-color: var(--background); }
  .bg-card { background-color: var(--card); }
  .bg-secondary { background-color: var(--secondary); }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-float-delayed {
    animation: float 4s ease-in-out infinite;
    animation-delay: 1s;
  }

  :global(.animate-marquee) {
    display: flex;
    animation: marquee 30s linear infinite;
  }

  :global(::-webkit-scrollbar) {
    width: 8px;
  }
  :global(::-webkit-scrollbar-track) {
    background: var(--background);
  }
  :global(::-webkit-scrollbar-thumb) {
    background: var(--secondary);
    border-radius: 4px;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--border);
  }
</style>