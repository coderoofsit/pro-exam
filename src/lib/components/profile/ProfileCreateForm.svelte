<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Exam } from '$lib/api/exams';

  const teacherSubjects = [
    { label: 'Mathematics', value: 'mathematics' },
    { label: 'Chemistry', value: 'chemistry' },
    { label: 'Physics', value: 'physics' },
    { label: 'Biology', value: 'biology' }
  ] as const;

  export type ProfileCreateSubmitPayload = {
    firstName: string;
    lastName: string;
    imageFile: File | null;
  } & (
    | { preferredExamIds: string[]; preferredSubjectIds?: never }
    | { preferredExamIds?: never; preferredSubjectIds: string[] }
  );

  let {
    exams = [],
    loading = false,
    submitError = '',
    submitSuccess = '',
    role = 'student'
  }: {
    exams: Exam[];
    loading?: boolean;
    submitError?: string;
    submitSuccess?: string;
    role?: 'student' | 'teacher' | 'institute';
  } = $props();

  const dispatch = createEventDispatcher<{
    submit: ProfileCreateSubmitPayload;
  }>();

  let firstName = $state('');
  let lastName = $state('');
  let imageFile = $state<File | null>(null);
  let imagePreview = $state<string | null>(null);
  let selectedExams = $state<string[]>([]);
  let examSearch = $state('');
  let dropdownOpen = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);
  let dropdownTriggerEl = $state<HTMLButtonElement | null>(null);
  let dropdownPanelEl = $state<HTMLDivElement | null>(null);
  let dropdownOpenUpward = $state(false);

  const isTeacherRole = $derived(role === 'teacher');

  const filteredExams = $derived(
    exams.filter((e) => e.name.en.toLowerCase().includes(examSearch.toLowerCase()))
  );

  const filteredTeacherSubjects = $derived(
    teacherSubjects.filter((subject) =>
      subject.label.toLowerCase().includes(examSearch.toLowerCase())
    )
  );

  const isFormValid = $derived(
    firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      selectedExams.length > 0
  );

  function handleImageChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    imageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    imageFile = null;
    imagePreview = null;
    if (fileInputEl) fileInputEl.value = '';
  }

  function toggleExam(id: string) {
    if (selectedExams.includes(id)) {
      selectedExams = selectedExams.filter((x) => x !== id);
    } else {
      selectedExams = [...selectedExams, id];
    }
  }

  function removeExam(id: string) {
    selectedExams = selectedExams.filter((x) => x !== id);
  }

  function getExamName(id: string) {
    return exams.find((e) => e._id === id)?.name.en ?? id;
  }

  function getPreferenceName(id: string) {
    if (isTeacherRole) {
      return teacherSubjects.find((subject) => subject.value === id)?.label ?? id;
    }
    return getExamName(id);
  }

  function closeDropdown() {
    dropdownOpen = false;
  }

  function updateDropdownDirection() {
    if (typeof window === 'undefined' || !dropdownTriggerEl || !dropdownPanelEl) return;

    const triggerRect = dropdownTriggerEl.getBoundingClientRect();
    const panelHeight = dropdownPanelEl.offsetHeight || 300;
    const gap = 8;
    const viewportPadding = 16;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;

    dropdownOpenUpward = spaceBelow < panelHeight + gap && spaceAbove > spaceBelow;
  }

  $effect(() => {
    if (!dropdownOpen || typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      updateDropdownDirection();
    });

    const handleViewportChange = () => updateDropdownDirection();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  });

  function handleSubmit() {
    if (!isFormValid || loading) return;

    dispatch('submit', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      imageFile,
      ...(isTeacherRole
        ? { preferredSubjectIds: selectedExams }
        : { preferredExamIds: selectedExams })
    });
  }
</script>

<div class="min-h-screen bg-[var(--pc-page-bg)] font-sans flex items-start justify-center px-4 py-12">
  <div class="w-full max-w-xl">
    <div class="rounded-card px-8 py-8 bg-[var(--pc-card-bg)] border border-[var(--pc-card-border)] shadow-[var(--pc-card-shadow)] backdrop-blur-sm">
      <div class="mb-8 flex flex-col items-center gap-3">
        <div class="relative group">
          <div class="h-24 w-24 rounded-full overflow-hidden ring-2 ring-[var(--pc-avatar-ring)] ring-offset-2 ring-offset-[var(--pc-page-bg)]">
            {#if imagePreview}
              <img src={imagePreview} alt="Avatar preview" class="h-full w-full object-cover" />
              <button
                type="button"
                onclick={removeImage}
                class="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--pc-avatar-overlay-bg)] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Remove photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="text-white">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>
            {:else}
              <div class="h-full w-full flex items-center justify-center bg-[var(--pc-avatar-placeholder-bg)]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="text-[var(--pc-avatar-placeholder-icon)]">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6" />
                  <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                </svg>
              </div>
            {/if}
          </div>
        </div>

        <label class="inline-flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--pc-avatar-btn-bg)] border border-[var(--pc-avatar-btn-border)] text-[var(--pc-avatar-btn-text)] transition-colors duration-150 hover:bg-[var(--pc-avatar-btn-hover-bg)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {imagePreview ? 'Change photo' : 'Upload photo'}
          <input
            bind:this={fileInputEl}
            type="file"
            accept="image/*"
            class="hidden"
            onchange={handleImageChange}
          />
        </label>

        <p class="text-[11px] text-[var(--pc-section-label)]">JPG, PNG or WEBP · Max 5 MB</p>
      </div>

      <div class="border-t border-[var(--pc-divider)] mb-7"></div>

      <div class="flex flex-col gap-5">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-[var(--pc-label)]">
              First name <span class="text-[var(--pc-label-required)]">*</span>
            </label>
            <input
              bind:value={firstName}
              type="text"
              placeholder="Arjun"
              class="h-11 w-full rounded-xl px-4 text-sm outline-none bg-[var(--pc-input-bg)] border border-[var(--pc-input-border)] text-[var(--pc-input-text)] placeholder:text-[var(--pc-input-placeholder)] transition-[border,box-shadow] duration-150 focus:border-[var(--pc-input-border-focus)] focus:ring-4 focus:ring-[var(--pc-input-ring-focus)]"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-[var(--pc-label)]">
              Last name <span class="text-[var(--pc-label-required)]">*</span>
            </label>
            <input
              bind:value={lastName}
              type="text"
              placeholder="Sharma"
              class="h-11 w-full rounded-xl px-4 text-sm outline-none bg-[var(--pc-input-bg)] border border-[var(--pc-input-border)] text-[var(--pc-input-text)] placeholder:text-[var(--pc-input-placeholder)] transition-[border,box-shadow] duration-150 focus:border-[var(--pc-input-border-focus)] focus:ring-4 focus:ring-[var(--pc-input-ring-focus)]"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-[var(--pc-label)]">
            {isTeacherRole ? 'Preferred subjects' : 'Preferred exams'} <span class="text-[var(--pc-label-required)]">*</span>
          </label>

          <div class="relative">
            <button
              bind:this={dropdownTriggerEl}
              type="button"
              onclick={() => { dropdownOpen = !dropdownOpen; examSearch = ''; }}
              class="flex w-full items-center justify-between gap-2 h-11 px-4 rounded-xl text-sm text-left bg-[var(--pc-input-bg)] border border-[var(--pc-input-border)] text-[var(--pc-input-placeholder)] transition-[border] duration-150 hover:border-[var(--pc-input-border-focus)]"
            >
              <span>
                {selectedExams.length > 0
                  ? `${selectedExams.length} ${isTeacherRole ? `subject${selectedExams.length > 1 ? 's' : ''}` : `exam${selectedExams.length > 1 ? 's' : ''}`} selected`
                  : `Select ${isTeacherRole ? 'subjects' : 'exams'}…`}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-shrink-0 transition-transform duration-200 {dropdownOpen ? 'rotate-180' : ''}">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            {#if dropdownOpen}
              <button
                class="fixed inset-0 z-10 cursor-default bg-transparent"
                aria-label="Close exam dropdown"
                onclick={closeDropdown}
              ></button>

              <div
                bind:this={dropdownPanelEl}
                class="absolute left-0 right-0 z-20 overflow-hidden rounded-xl bg-[var(--pc-select-bg)] border border-[var(--pc-select-border)] shadow-[var(--pc-select-shadow)] {dropdownOpenUpward ? 'bottom-full mb-2' : 'top-full mt-2'}"
              >
                <div class="p-2 border-b border-[var(--pc-divider)]">
                  <div class="relative">
                    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pc-input-placeholder)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" />
                        <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      </svg>
                    </span>
                    <input
                      bind:value={examSearch}
                      type="text"
                      placeholder={isTeacherRole ? 'Search subjects…' : 'Search exams…'}
                      class="h-9 w-full rounded-lg pl-9 pr-3 text-xs outline-none bg-[var(--pc-select-search-bg)] border border-[var(--pc-select-search-border)] text-[var(--pc-input-text)] placeholder:text-[var(--pc-input-placeholder)] focus:border-[var(--pc-input-border-focus)]"
                    />
                  </div>
                </div>

                <ul class="max-h-[220px] overflow-y-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {#if isTeacherRole}
                    {#if filteredTeacherSubjects.length > 0}
                      {#each filteredTeacherSubjects as subject}
                        {@const picked = selectedExams.includes(subject.value)}
                        <li>
                          <button
                            type="button"
                            onclick={() => toggleExam(subject.value)}
                            class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 {picked ? 'bg-[var(--pc-select-item-selected-bg)]' : 'hover:bg-[var(--pc-select-item-hover-bg)]'}"
                          >
                            <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors duration-100 {picked ? 'bg-[var(--pc-select-check)] border-[var(--pc-select-check)]' : 'border-[var(--pc-input-border)] bg-transparent'}">
                              {#if picked}
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-white">
                                  <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                              {/if}
                            </span>

                            <div class="min-w-0 flex-1">
                              <p class="truncate text-sm font-medium text-[var(--pc-select-item-text)] {picked ? 'text-[var(--pc-select-item-selected-text)]' : ''}">
                                {subject.label}
                              </p>
                            </div>
                          </button>
                        </li>
                      {/each}
                    {:else}
                      <li class="px-4 py-6 text-center text-sm text-[var(--pc-select-empty)]">
                        No subjects found
                      </li>
                    {/if}
                  {:else if filteredExams.length > 0}
                    {#each filteredExams as exam}
                      {@const picked = selectedExams.includes(exam._id)}
                      <li>
                        <button
                          type="button"
                          onclick={() => toggleExam(exam._id)}
                          class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 {picked ? 'bg-[var(--pc-select-item-selected-bg)]' : 'hover:bg-[var(--pc-select-item-hover-bg)]'}"
                        >
                          <span class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors duration-100 {picked ? 'bg-[var(--pc-select-check)] border-[var(--pc-select-check)]' : 'border-[var(--pc-input-border)] bg-transparent'}">
                            {#if picked}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" class="text-white">
                                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            {/if}
                          </span>

                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium text-[var(--pc-select-item-text)] {picked ? 'text-[var(--pc-select-item-selected-text)]' : ''}">
                              {exam.name.en}
                            </p>
                            {#if exam.description}
                              <p class="truncate text-xs text-[var(--pc-select-item-sub)]">{exam.description}</p>
                            {/if}
                          </div>
                        </button>
                      </li>
                    {/each}
                  {:else}
                    <li class="px-4 py-6 text-center text-sm text-[var(--pc-select-empty)]">
                      No exams found
                    </li>
                  {/if}
                </ul>
              </div>
            {/if}
          </div>

          {#if selectedExams.length > 0}
            <div class="mt-2 flex flex-wrap gap-2">
              {#each selectedExams as id}
                <span class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium bg-[var(--pc-tag-bg)] border border-[var(--pc-tag-border)] text-[var(--pc-tag-text)]">
                  {getPreferenceName(id)}
                  <button
                    type="button"
                    onclick={() => removeExam(id)}
                    class="flex items-center rounded hover:bg-[var(--pc-tag-remove-hover)] transition-colors p-0.5"
                    title="Remove"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                  </button>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        {#if submitSuccess}
          <div class="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm bg-[var(--pc-success-bg)] border border-[var(--pc-success-border)] text-[var(--pc-success-text)]">
            {submitSuccess}
          </div>
        {/if}

        {#if submitError}
          <div class="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm bg-[var(--pc-error-bg)] border border-[var(--pc-error-border)] text-[var(--pc-error-text)]">
            {submitError}
          </div>
        {/if}

        <button
          type="button"
          onclick={handleSubmit}
          disabled={!isFormValid || loading}
          class="mt-1 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-sm font-semibold tracking-wide text-[var(--pc-btn-text)] bg-[var(--pc-btn-bg)] shadow-[var(--pc-btn-shadow)] transition-[shadow,opacity] duration-200 hover:shadow-[var(--pc-btn-hover-shadow)] disabled:opacity-[var(--pc-btn-disabled-opacity)] disabled:cursor-not-allowed disabled:shadow-none"
        >
          {#if loading}
            <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" stroke-dasharray="56" stroke-dashoffset="42" stroke-linecap="round" />
            </svg>
            Creating profile…
          {:else}
            Create Profile
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>