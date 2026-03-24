<script lang="ts">
  type Exam = { id: string; name: string; logo: string; };
  type Tool = { id: string; label: string; icon: 'ncert' | 'ar' | 'diagram' | 'match' };

  // Replace with your API data
  const exams: Exam[] = [
    { id: 'jee',    name: 'JEE Mains', logo: '/logos/jee.png'    },
    { id: 'neet',   name: 'NEET',      logo: '/logos/neet.png'   },
    { id: 'mhtcet', name: 'MHT CET',   logo: '/logos/mhtcet.png' },
    { id: 'gujcet', name: 'GUJCET',    logo: '/logos/gujcet.png' },
  ];

  const tools: Tool[] = [
    { id: 'ncert',   label: 'NCERT Line by line', icon: 'ncert'   },
    { id: 'ar',      label: 'AR & Statement',      icon: 'ar'      },
    { id: 'diagram', label: 'Diagram',              icon: 'diagram' },
    { id: 'match',   label: 'Match Type',           icon: 'match'   },
  ];

  const socialLinks = [
    { id: 'youtube',   label: 'YouTube',   href: '#', color: '#FF4444' },
    { id: 'instagram', label: 'Instagram', href: '#', color: '#E1306C' },
    { id: 'telegram',  label: 'Telegram',  href: '#', color: '#229ED9' },
    { id: 'facebook',  label: 'Facebook',  href: '#', color: '#1877F2' },
    { id: 'linkedin',  label: 'LinkedIn',  href: '#', color: '#0A66C2' },
    { id: 'whatsapp',  label: 'WhatsApp',  href: '#', color: '#25D366' },
  ];

  // Svelte 5 event handler for broken images
  function handleImgError(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    img.style.display = 'none';
  }
</script>

<div class="min-h-screen bg-[var(--sh-page-bg)] font-sans transition-colors duration-300">
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-10">

    <!-- ══ HERO ══ -->
    <div class="relative overflow-hidden rounded-3xl px-8 py-10 text-center
      bg-[linear-gradient(135deg,var(--sh-ai-card-bg)_0%,var(--sh-banner-bg)_100%)]
      border border-[var(--sh-ai-card-border)]">
      <!-- Decorative glow blobs -->
      <div class="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-[var(--sb-nav-active-indicator)] opacity-10 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-[var(--sh-ai-pill-icon)] opacity-10 blur-3xl"></div>

      <div class="relative flex justify-center mb-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8B5CF6_0%,#4f7eff_100%)] shadow-[0_0_32px_rgba(139,92,246,0.4)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M9 7v4l1.5-1L12 11V7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-[var(--sh-section-title)]">EXAMFLOW</h1>
      <p class="mt-1 text-base font-semibold text-[var(--sb-nav-active-indicator)]">For Students</p>
      <p class="mt-2 text-sm text-[var(--sh-ai-sub)] max-w-xs mx-auto">Practice smarter. Track progress. Ace every exam.</p>
    </div>

    <!-- ══ QUESTIONS BY CHAPTER ══ -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-[var(--sh-section-title)]">Questions by Chapter</h2>
          <p class="text-xs text-[var(--sh-ai-sub)] mt-0.5">Explore subject-wise chapters</p>
        </div>
        <a href="/student/exams" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-section-link)] hover:text-[var(--sh-section-link-hover)] transition-colors">View All →</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#each exams as exam}
          <a href="/student/exams/{exam.id}/chapters"
            class="group relative flex flex-col justify-between rounded-2xl p-4 min-h-[110px] overflow-hidden bg-[var(--sh-exam-card-bg)] border border-[var(--sh-exam-card-border)] transition-all duration-200 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)] hover:-translate-y-0.5">
            <span class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)] transition-colors group-hover:bg-[var(--sh-exam-card-arrow-hover-bg)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <p class="text-sm font-semibold text-[var(--sh-exam-card-title)] pr-7 leading-tight">{exam.name}</p>
            <div class="flex justify-end mt-3">
              <div class="h-11 w-11 rounded-full overflow-hidden bg-[var(--sh-exam-card-arrow-bg)] flex items-center justify-center ring-2 ring-[var(--sh-exam-card-border)]">
                <img src={exam.logo} alt={exam.name} class="h-full w-full object-contain" onerror={handleImgError}/>
              </div>
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- ══ TOOLBOX ══ -->
    <section>
      <div class="flex items-end gap-4 mb-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-widest text-[var(--sh-toolbox-label)]">Toolbox</span>
          <p class="text-sm font-medium text-[var(--sh-section-title)] mt-0.5">For future Doctors &amp; Engineers</p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#each tools as tool}
          <a href="/student/tools/{tool.id}"
            class="group flex flex-col items-center justify-center gap-3 rounded-2xl py-6 px-4 text-center bg-[var(--sh-tool-card-bg)] border border-[var(--sh-tool-card-border)] transition-all duration-200 hover:border-[var(--sh-tool-card-hover-border)] hover:shadow-[var(--sh-tool-card-hover-shadow)] hover:-translate-y-0.5">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-tool-card-icon)] transition-colors group-hover:bg-[var(--sh-tool-card-hover-border)]/10">
              {#if tool.icon === 'ncert'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7l9 5 9-5-9-5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {:else if tool.icon === 'ar'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {:else if tool.icon === 'diagram'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M17.5 14v7M14 17.5h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
              {:else if tool.icon === 'match'}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="19" cy="12" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg>
              {/if}
            </span>
            <span class="text-xs font-semibold leading-snug text-[var(--sh-tool-card-text)]">{tool.label}</span>
          </a>
        {/each}
      </div>
    </section>

    <!-- ══ CHAPTER WISE PYQ ══ -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-[var(--sh-section-title)]">Chapter wise PYQ</h2>
          <p class="text-xs text-[var(--sh-ai-sub)] mt-0.5">Previous year questions by chapter</p>
        </div>
        <a href="/student/pyq" class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-section-link)] hover:text-[var(--sh-section-link-hover)] transition-colors">View All →</a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {#each exams as exam}
          <a href="/student/pyq/{exam.id}"
            class="group relative flex flex-col justify-between rounded-2xl p-4 min-h-[110px] overflow-hidden bg-[var(--sh-exam-card-bg)] border border-[var(--sh-exam-card-border)] transition-all duration-200 hover:border-[var(--sh-exam-card-hover-border)] hover:shadow-[var(--sh-exam-card-hover-shadow)] hover:-translate-y-0.5">
            <span class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--sh-exam-card-arrow-bg)] text-[var(--sh-exam-card-arrow-color)] transition-colors group-hover:bg-[var(--sh-exam-card-arrow-hover-bg)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <p class="text-sm font-semibold text-[var(--sh-exam-card-title)] pr-7 leading-tight">{exam.name}</p>
            <div class="flex justify-end mt-3">
              <div class="h-11 w-11 rounded-full overflow-hidden bg-[var(--sh-exam-card-arrow-bg)] flex items-center justify-center ring-2 ring-[var(--sh-exam-card-border)]">
                <img src={exam.logo} alt={exam.name} class="h-full w-full object-contain" onerror={handleImgError}/>
              </div>
            </div>
          </a>
        {/each}
      </div>
    </section>

    <!-- ══ ACTION BANNERS ══ -->
    <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- PYQ Mock Tests -->
      <a href="/student/tests/pyq"
        class="group relative flex items-center justify-between gap-4 rounded-2xl px-5 py-5 overflow-hidden bg-[var(--sh-banner-bg)] border border-[var(--sh-banner-border)] transition-all duration-200 hover:shadow-[var(--sh-banner-hover-shadow)] hover:border-[var(--sh-exam-card-hover-border)] hover:-translate-y-0.5">
        <!-- NEW badge -->
        <span class="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-b-xl text-[10px] font-bold tracking-widest bg-[var(--sh-badge-new-bg)] text-[var(--sh-badge-new-text)]">NEW</span>
        <div class="flex items-center gap-3 mt-2">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-icon)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><rect x="9" y="3" width="6" height="4" rx="1.5" stroke="currentColor" stroke-width="1.75"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>
          </span>
          <span class="text-sm font-semibold text-[var(--sh-banner-title)]">PYQ Mock Tests</span>
        </div>
        <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-arrow-color)] transition-colors group-hover:bg-[var(--sh-banner-arrow-hover-bg)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>

      <a href="/student/tests/own"
        class="group flex items-center justify-between gap-4 rounded-2xl px-5 py-5 bg-[var(--sh-banner-bg)] border border-[var(--sh-banner-border)] transition-all duration-200 hover:shadow-[var(--sh-banner-hover-shadow)] hover:border-[var(--sh-exam-card-hover-border)] hover:-translate-y-0.5">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-icon)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.75"/><path d="M9 9l3 2-3 2V9Z" fill="currentColor"/></svg>
          </span>
          <span class="text-sm font-semibold text-[var(--sh-banner-title)]">Join Online Mock Tests</span>
        </div>
        <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-arrow-color)] transition-colors group-hover:bg-[var(--sh-banner-arrow-hover-bg)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>

      <a href="/student/tests/batch"
        class="group flex items-center justify-between gap-4 rounded-2xl px-5 py-5 bg-[var(--sh-banner-bg)] border border-[var(--sh-banner-border)] transition-all duration-200 hover:shadow-[var(--sh-banner-hover-shadow)] hover:border-[var(--sh-exam-card-hover-border)] hover:-translate-y-0.5">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-icon)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.75"/><path d="M9 9l3 2-3 2V9Z" fill="currentColor"/></svg>
          </span>
          <span class="text-sm font-semibold text-[var(--sh-banner-title)]">Batch Mock Tests</span>
        </div>
        <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--sh-banner-arrow-bg)] text-[var(--sh-banner-arrow-color)] transition-colors group-hover:bg-[var(--sh-banner-arrow-hover-bg)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </a>
    </section>

    <section>
      <a href="/student/chapter-ai"
        class="group flex flex-col sm:flex-row sm:items-center gap-5 rounded-2xl px-6 py-5 bg-[var(--sh-ai-card-bg)] border border-[var(--sh-ai-card-border)] transition-all duration-200 hover:shadow-[var(--sh-ai-card-hover-shadow)] hover:-translate-y-0.5">
        <div class="flex items-center gap-4 flex-1">
          <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--sh-ai-pill-bg)] text-[var(--sh-ai-pill-icon)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          </span>
          <div>
            <div class="flex items-center gap-1.5">
              <p class="text-base font-bold text-[var(--sh-ai-title)]">Chapter AI</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="text-[var(--sh-ai-title)]"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <p class="text-xs text-[var(--sh-ai-sub)] mt-0.5">Your Smart Learning Assistant for Every Chapter</p>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          {#each ['Powered by AI', 'Chapter-Wise Support'] as pill}
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--sh-ai-pill-bg)] border border-[var(--sh-ai-pill-border)] text-[var(--sh-ai-pill-text)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" class="text-[var(--sh-ai-pill-icon)]"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
              {pill}
            </span>
          {/each}
        </div>
      </a>
    </section>

    <!-- ══ WHATSAPP ══ -->
    <section>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl px-6 py-5 bg-[var(--sh-wa-card-bg)] border border-[var(--sh-wa-card-border)]">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(34,197,94,0.14)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#22C55E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div>
            <p class="text-sm font-bold text-[var(--sh-wa-title)]">Join Our WhatsApp Community</p>
            <p class="mt-1 text-xs leading-relaxed text-[var(--sh-wa-sub)]">Connect with peers, get updates, and receive exclusive study materials.</p>
          </div>
        </div>
        <a href="https://wa.me/" target="_blank" rel="noopener noreferrer"
          class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--sh-wa-btn-bg)] text-[var(--sh-wa-btn-text)] shadow-[var(--sh-wa-btn-shadow)] transition-colors hover:bg-[var(--sh-wa-btn-hover-bg)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Join Community
        </a>
      </div>
    </section>

    <!-- ══ FOR TEACHER ══ -->
    <section>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl px-6 py-5 bg-[var(--sh-teacher-card-bg)] border border-[var(--sh-teacher-card-border)]">
        <div>
          <p class="text-base font-bold text-[var(--sh-teacher-title)]">ExamFlow for Teacher</p>
          <p class="mt-0.5 text-xs text-[var(--sh-teacher-sub)]">Create exam papers and manage exams with ease.</p>
        </div>
        <a href="/tutor/dashboard"
          class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--sh-teacher-btn-bg)] text-[var(--sh-teacher-btn-text)] shadow-[var(--sh-teacher-btn-shadow)] transition-shadow hover:shadow-[var(--sh-teacher-btn-hover-shadow)]">
          Switch to Teacher
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </section>

    <!-- ══ SOCIAL MEDIA ══ -->
    <section class="pb-6">
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 h-px bg-[var(--sh-social-divider)]"></div>
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--sh-exam-card-arrow-bg)] ring-1 ring-[var(--sh-exam-card-border)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="var(--sb-nav-active-indicator)" stroke-width="1.8" stroke-linecap="round"/><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" stroke="var(--sb-nav-active-indicator)" stroke-width="1.8" stroke-linecap="round"/><path d="M9 7v4l1.5-1L12 11V7" stroke="var(--sb-nav-active-indicator)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="flex-1 h-px bg-[var(--sh-social-divider)]"></div>
      </div>
      <div class="text-center mb-5">
        <p class="text-lg font-bold text-[var(--sh-social-title)]">We're on social media</p>
        <p class="mt-1.5 text-xs leading-relaxed text-[var(--sh-social-sub)] max-w-sm mx-auto">Follow us &amp; share with friends. It motivates us to keep working hard and keep the app FREE.</p>
      </div>
      <div class="grid grid-cols-3 gap-3">
        {#each socialLinks as social}
          <a href={social.href} target="_blank" rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium bg-[var(--sh-social-btn-bg)] border border-[var(--sh-social-btn-border)] text-[var(--sh-social-btn-text)] transition-all duration-150 hover:bg-[var(--sh-social-btn-hover-bg)] hover:border-[var(--sh-social-btn-hover-border)] hover:text-[var(--sh-social-btn-hover-text)]">
            <!-- Simple colored dot instead of complex SVG per platform -->
            <span class="h-3 w-3 rounded-full flex-shrink-0" style="background-color: {social.color}"></span>
            <span>{social.label}</span>
          </a>
        {/each}
      </div>
    </section>

  </div>
</div>