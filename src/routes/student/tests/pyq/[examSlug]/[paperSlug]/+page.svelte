<script lang="ts">
  import type { PageData } from './$types';
  import { updateQuestion, updateQuestionApproveStatus } from '$lib/api/questions';
  import MathText from '$lib/components/MathText.svelte';
  import { questionPromptEnContent } from '$lib/api/questions';

  let { data }: { data: PageData } = $props();

  const examSlug = $derived(data.examSlug ?? '');
  let questions = $state((data.questions ?? []) as Array<Record<string, any>>);
  const error = $derived(data.error ?? null);
  let editingQuestionId = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  let editingQuestionKind = $state<'MCQ' | 'MSQ' | 'INTEGER' | 'FILLS'>('MCQ');
  let draftContent = $state('');
  let draftExplanation = $state('');
  let draftRePhrasedExplanation = $state('');
  let draftOptions = $state<Array<{ identifier: string; content: string }>>([]);
  let draftCorrectIdentifiers = $state<string[]>([]);
  let draftFills = $state<string[]>([]);
  let draftInteger = $state('');

  // Group questions by subjectSlug
  const subjectGroups = $derived.by(() => {
    const map = new Map<string, Array<Record<string, any>>>();
    for (const q of questions) {
      const key = String(q.subjectSlug || 'other');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return map;
  });

  const subjectTabs = $derived(Array.from(subjectGroups.keys()));
  let activeTab = $state<string>('');

  $effect(() => {
    if (!activeTab && subjectTabs.length > 0) {
      activeTab = subjectTabs[0];
    }
  });

  const activeQuestions = $derived(subjectGroups.get(activeTab) ?? []);

  const examName = $derived.by(() =>
    examSlug
      .split('-')
      .filter(Boolean)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );

  function startEdit(q: Record<string, any>) {
    editingQuestionId = String(q?._id ?? '');
    saveError = null;
    draftContent = String(q?.prompt?.en?.content ?? '');
    draftExplanation = String(q?.prompt?.en?.explanation ?? '');
    draftRePhrasedExplanation = String(q?.prompt?.en?.rePhrasedExplanation ?? '');
    const options = Array.isArray(q?.prompt?.en?.options) ? q.prompt.en.options : [];
    const kindRaw = String(q?.kind ?? '').toUpperCase();
    editingQuestionKind =
      kindRaw === 'MSQ' || kindRaw === 'MCQ' || kindRaw === 'INTEGER'
        ? (kindRaw as any)
        : (options.length > 0 ? 'MCQ' : 'FILLS');
    draftOptions = options.map((opt: any) => ({
      identifier: String(opt?.identifier ?? '').trim(),
      content: String(opt?.content ?? '').trim()
    }));
    draftCorrectIdentifiers = Array.isArray(q?.correct?.identifiers)
      ? q.correct.identifiers.map((x: unknown) => String(x ?? '').trim()).filter(Boolean)
      : [];
    draftFills = Array.isArray(q?.correct?.fills)
      ? q.correct.fills.map((x: unknown) => String(x ?? '').trim())
      : [];
    draftInteger =
      typeof q?.correct?.integer === 'number' || typeof q?.correct?.integer === 'string'
        ? String(q.correct.integer)
        : '';
  }

  function cancelEdit() {
    editingQuestionId = null;
    saveError = null;
  }

  async function saveEdit(questionId: string) {
    saveError = null;
    try {
      const options = draftOptions
        .map((opt) => ({
          identifier: String(opt.identifier ?? '').trim(),
          content: String(opt.content ?? '').trim(),
          images: [] as string[]
        }))
        .filter((opt) => opt.identifier && opt.content);

      const identifiers =
        editingQuestionKind === 'MCQ'
          ? draftCorrectIdentifiers.slice(0, 1)
          : editingQuestionKind === 'MSQ'
            ? draftCorrectIdentifiers
            : [];

      const payload = {
        kind: editingQuestionKind,
        prompt: {
          en: {
            content: draftContent,
            explanation: draftExplanation,
            rePhrasedExplanation: draftRePhrasedExplanation,
            options: editingQuestionKind === 'MCQ' || editingQuestionKind === 'MSQ' ? options : []
          }
        },
        correct: {
          identifiers,
          fills: editingQuestionKind === 'FILLS' ? draftFills.map((s) => s.trim()).filter(Boolean) : [],
          ...(editingQuestionKind === 'INTEGER' && draftInteger.trim() ? { integer: Number(draftInteger.trim()) } : {})
        }
      };

      const updated = await updateQuestion(questionId, payload);

      const next = questions.map((q) => {
        if (String(q?._id) !== questionId) return q;
        return {
          ...q,
          ...(updated ?? {}),
          kind: (updated as any)?.kind ?? editingQuestionKind,
          prompt: (updated as any)?.prompt ?? payload.prompt,
          correct: (updated as any)?.correct ?? payload.correct
        };
      });

      questions = next;
      editingQuestionId = null;
    } catch (e) {
      saveError = e instanceof Error ? e.message : 'Could not save question changes.';
    }
  }

  function toggleCorrectOption(identifier: string) {
    const id = String(identifier ?? '').trim();
    if (!id) return;
    if (editingQuestionKind === 'MCQ') {
      draftCorrectIdentifiers =
        draftCorrectIdentifiers.length === 1 && draftCorrectIdentifiers[0] === id ? [] : [id];
      return;
    }
    if (editingQuestionKind === 'MSQ') {
      if (draftCorrectIdentifiers.includes(id)) {
        draftCorrectIdentifiers = draftCorrectIdentifiers.filter((x) => x !== id);
      } else {
        draftCorrectIdentifiers = [...draftCorrectIdentifiers, id];
      }
    }
  }

  async function toggleApprove(questionId: string, currentApprove: boolean) {
    try {
      await updateQuestionApproveStatus(questionId, !currentApprove);
      questions = questions.map((q) =>
        String(q._id) === questionId ? { ...q, approve: !currentApprove } : q
      );
    } catch {
      // silent
    }
  }
</script>

<svelte:head>
  <title>{examName || 'PYQ'} Paper Questions · Exam Abhyas</title>
</svelte:head>

<div class="min-h-full bg-[var(--pyq-page-bg)] font-sans transition-colors duration-300">
  <div class="mx-auto max-w-4xl px-4 py-8">
    <h1 class="mb-5 text-xl font-bold text-[var(--pyq-accordion-title)]">
      {examName} Paper Questions
    </h1>

    {#if error}
      <div class="rounded-2xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]">
        {error}
      </div>
    {:else if questions.length === 0}
      <div class="rounded-2xl border border-[var(--pyq-accordion-border)] bg-[var(--pyq-accordion-bg)] px-4 py-3 text-sm text-[var(--pyq-accordion-title)]">
        No questions found for this paper.
      </div>
    {:else}
      {#if saveError}
        <div class="mb-3 rounded-lg border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-3 py-2 text-xs text-[var(--pc-error-text)]">
          {saveError}
        </div>
      {/if}

      <!-- Subject tabs -->
      {#if subjectTabs.length > 1}
        <div class="mb-5 flex flex-wrap gap-2">
          {#each subjectTabs as tab}
            <button
              type="button"
              onclick={() => (activeTab = tab)}
              class="rounded-full px-4 py-1.5 text-sm font-semibold transition-all
                {activeTab === tab
                  ? 'bg-[var(--page-link)] text-white shadow-md'
                  : 'border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] text-[var(--pyq-paper-meta)] hover:text-[var(--pyq-paper-title)]'}"
            >
              {tab.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              <span class="ml-1 text-xs opacity-70">({subjectGroups.get(tab)?.length ?? 0})</span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="space-y-3">
        {#each activeQuestions as q, idx (q._id)}
          {@const prompt = questionPromptEnContent(q as any)}
          {@const options = q.prompt?.en?.options ?? []}
          {@const explanation = (q.prompt?.en?.explanation ?? '').trim()}
          {@const rePhrasedExplanation = (q.prompt?.en?.rePhrasedExplanation ?? '').trim()}
          {@const fills = q.correct?.fills ?? []}
          {@const integerValue = q.correct?.integer}
          {@const kind = String(q.kind ?? '').toUpperCase()}
          {@const isMcq = kind === 'MCQ' || (kind === '' && options.length > 0)}
          {@const isMsq = kind === 'MSQ'}
          {@const isInteger = kind === 'INTEGER' || (kind === '' && typeof integerValue === 'number')}
          {@const isFill = kind === 'FILLS' || (!isMcq && !isMsq && !isInteger && fills.length > 0)}
          {@const isEditing = editingQuestionId === q._id}
          <section class="rounded-2xl border border-[var(--pyq-paper-border)] bg-[var(--pyq-paper-bg)] p-4">
            <div class="flex items-start justify-between gap-3">
              <h2 class="text-base font-semibold text-[var(--pyq-paper-title)]">
                Q{idx + 1}. {#if isEditing}Editing question{:else}<MathText content={prompt} />{/if}
              </h2>
              <div class="flex items-center gap-2">
                <span class="rounded-md border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-xs font-semibold text-[var(--pyq-paper-title)]">
                  {String(q.kind ?? 'NA').toUpperCase()}
                </span>
                <span class="max-w-[14rem] truncate rounded-md border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-1 text-xs font-medium text-[var(--pyq-paper-meta)]" title={String(q.slug ?? '')}>
                  {q.slug ? `slug: ${q.slug}` : 'slug: NA'}
                </span>
                {#if !isEditing}
                  <!-- Approve status badge + toggle -->
                  {#if q.approve}
                    <span class="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
                      ✓Appr
                    </span>
                  {:else}
                    <span class="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400">
                      ✗Unappr
                    </span>
                  {/if}
                  <button
                    type="button"
                    class="rounded-md border px-3 py-1 text-xs font-semibold transition
                      {q.approve
                        ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}"
                    onclick={() => toggleApprove(String(q._id), !!q.approve)}
                  >
                    {q.approve ? 'Unapprove' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    class="btn-cta-subscription-outline px-3 py-1 text-xs"
                    onclick={() => startEdit(q)}
                  >
                    Edit
                  </button>
                {/if}
              </div>
            </div>

            {#if isEditing}
              <div class="mt-3 space-y-3">
                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Question
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" rows="3" bind:value={draftContent}></textarea>
                </label>

                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Explanation
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-lg text-[var(--pyq-paper-title)]" rows="3" bind:value={draftExplanation}></textarea>
                </label>

                <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                  Re-phrased Explanation
                  <textarea class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" rows="3" bind:value={draftRePhrasedExplanation}></textarea>
                </label>

                {#if editingQuestionKind === 'MCQ' || editingQuestionKind === 'MSQ'}
                  <div class="space-y-2">
                    {#each draftOptions as opt, optIndex (opt.identifier + optIndex)}
                      {@const selected = draftCorrectIdentifiers.includes(opt.identifier)}
                      <div class="flex items-center gap-2 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-2 py-2">
                        <input
                          class="w-14 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-sm text-[var(--pyq-paper-title)]"
                          bind:value={draftOptions[optIndex].identifier}
                          placeholder="A"
                        />
                        <input
                          class="flex-1 rounded border border-[var(--pyq-paper-border)] bg-transparent px-2 py-1 text-base text-[var(--pyq-paper-title)]"
                          bind:value={draftOptions[optIndex].content}
                          placeholder="Option text"
                        />
                        <button
                          type="button"
                          class="rounded px-2 py-1 text-xs border {selected ? 'border-emerald-500 text-emerald-600' : 'border-[var(--pyq-paper-border)]'}"
                          onclick={() => toggleCorrectOption(opt.identifier)}
                        >
                          {selected ? 'Correct' : 'Mark correct'}
                        </button>
                      </div>
                    {/each}
                  </div>
                  <p class="text-[11px] text-[var(--pyq-paper-meta)]">
                    {editingQuestionKind === 'MCQ' ? 'MCQ allows only one correct option.' : 'MSQ allows multiple correct options.'}
                  </p>
                {:else if editingQuestionKind === 'INTEGER'}
                  <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                    Integer answer
                    <input type="number" class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]" bind:value={draftInteger} />
                  </label>
                {:else}
                  <label class="block text-xs font-semibold text-[var(--pyq-paper-meta)]">
                    Fills (comma separated)
                    <input
                      class="mt-1 w-full rounded-lg border border-[var(--pyq-paper-border)] bg-transparent px-3 py-2 text-base text-[var(--pyq-paper-title)]"
                      value={draftFills.join(', ')}
                      oninput={(e) => {
                        draftFills = (e.currentTarget as HTMLInputElement).value.split(',').map((s) => s.trim());
                      }}
                    />
                  </label>
                {/if}

                <div class="flex items-center justify-end gap-2">
                  <button type="button" class="btn-cta-subscription-outline px-3 py-1 text-xs" onclick={cancelEdit}>Cancel</button>
                  <button type="button" class="btn-cta-subscription px-3 py-1 text-xs" onclick={() => saveEdit(q._id)}>Save</button>
                </div>
              </div>
            {:else}
              <!-- Prompt images -->
              {#if q.prompt?.en?.images?.length}
                <div class="mt-3 grid grid-cols-2 gap-2">
                  {#each q.prompt.en.images as img}
                    {#if img?.url}
                      <img src={img.url} alt={img.alt ?? ''} class="max-h-48 w-full rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                    {/if}
                  {/each}
                </div>
              {/if}

              {#if isMcq || isMsq}
                <ul class="mt-3 space-y-2 text-base text-[var(--pyq-paper-title)]">
                  {#each options as opt}
                    {@const isCorrectOption = (q.correct?.identifiers ?? []).includes(opt.identifier)}
                    <li
                      class="flex items-start gap-2 rounded-lg border px-3 py-2 {isCorrectOption
                        ? 'border-emerald-500/70 bg-emerald-500/15'
                        : 'border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)]'}"
                    >
                      <span class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--pyq-paper-border)] text-[11px] font-semibold">
                        {opt.identifier}
                      </span>
                      <div class="min-w-0 flex-1 break-words text-[1.02rem] leading-[1.7] text-[var(--pyq-paper-title)]">
                        <MathText content={opt.content ?? ''} />
                        {#if opt.images?.length}
                          <div class="mt-2 flex flex-wrap gap-2">
                            {#each opt.images as img}
                              {#if img?.url}
                                <img src={img.url} alt={img.alt ?? ''} class="max-h-32 rounded border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                              {/if}
                            {/each}
                          </div>
                        {/if}
                      </div>
                      {#if isCorrectOption}
                        <span class="ml-auto text-[11px] font-semibold text-emerald-300">Correct</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {:else if isInteger}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-sm text-[var(--pyq-paper-meta)]">
                  <span class="font-semibold">Integer:</span> {integerValue}
                </div>
              {:else if isFill}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-sm text-[var(--pyq-paper-meta)]">
                  <span class="font-semibold">Fills:</span> {fills.join(', ')}
                </div>
              {/if}

              {#if explanation || q.prompt?.en?.explanationImages?.length || rePhrasedExplanation || q.prompt?.en?.rePhrasedImage?.length}
                <div class="mt-3 rounded-lg border border-[var(--pyq-paper-border)] bg-[var(--pyq-accordion-bg)] px-3 py-2 text-[1.05rem] leading-relaxed text-[var(--pyq-paper-title)]">
                  {#if explanation}
                    <span class="font-semibold text-sm">Explanation:</span>
                    <div class="mt-1"><MathText content={explanation} /></div>
                  {/if}
                  
                  {#if q.prompt?.en?.explanationImages?.length}
                    {#if !explanation}<span class="font-semibold text-sm">Explanation:</span>{/if}
                    <div class="mt-2 flex flex-wrap gap-2">
                      {#each q.prompt.en.explanationImages as img}
                        {#if img?.url}
                          <img src={img.url} alt={img.alt ?? ''} class="max-h-48 rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                        {/if}
                      {/each}
                    </div>
                  {/if}

                  {#if rePhrasedExplanation || q.prompt?.en?.rePhrasedImage?.length}
                    <div class="mt-3 border-t border-[var(--pyq-paper-border)]/60 pt-3">
                      <span class="font-semibold text-sm">Re-phrased explanation:</span>
                      {#if rePhrasedExplanation}
                        <div class="mt-1"><MathText content={rePhrasedExplanation} /></div>
                      {/if}

                      {#if q.prompt?.en?.rePhrasedImage?.length}
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each q.prompt.en.rePhrasedImage as img}
                            {#if img?.url}
                              <img src={img.url} alt={img.alt ?? ''} class="max-h-48 rounded-lg border border-[var(--pyq-paper-border)] object-contain bg-black/20" loading="lazy" />
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            {/if}
          </section>
        {/each}
      </div>
    {/if}
  </div>
</div>