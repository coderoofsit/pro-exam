<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { importInstituteUsers } from '$lib/api/auth';

  const ACCEPT = '.xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/json';
  const allowedExtensions = ['xlsx', 'xls', 'csv', 'json'];

  const dispatch = createEventDispatcher<{
    create: { file: File };
    cancel: void;
  }>();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let dragActive = $state(false);
  let selectedFile = $state<File | null>(null);
  let errorMessage = $state('');
  let successMessage = $state('');
  let submitting = $state(false);
  let modalOpen = $state(false);

  function isValidFile(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return allowedExtensions.includes(ext);
  }

  function setFile(file: File) {
    if (!isValidFile(file)) {
      errorMessage = 'Only .xlsx, .xls, .csv, or .json files are allowed.';
      selectedFile = null;
      return;
    }

    errorMessage = '';
    selectedFile = file;
  }

  function openFilePicker() {
    fileInputEl?.click();
  }

  function onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    setFile(file);
  }

  function clearSelectedFile() {
    selectedFile = null;
    errorMessage = '';
    successMessage = '';
    if (fileInputEl) fileInputEl.value = '';
  }

  function openModal() {
    modalOpen = true;
    errorMessage = '';
    successMessage = '';
  }

  function closeModal() {
    modalOpen = false;
    dragActive = false;
    errorMessage = '';
    successMessage = '';
    clearSelectedFile();
    dispatch('cancel');
  }

  async function onCreate() {
    if (!selectedFile) {
      errorMessage = 'Please select a file before creating.';
      return;
    }

    errorMessage = '';
    successMessage = '';
    submitting = true;
    try {
      const response = await importInstituteUsers({ file: selectedFile });
      if (!response.success) {
        errorMessage = response.message || 'Failed to import users.';
        return;
      }

      successMessage = 'Users imported successfully.';
      dispatch('create', { file: selectedFile });
      modalOpen = false;
      dragActive = false;
      clearSelectedFile();
    } catch {
      errorMessage = 'Unable to upload file. Please try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<section class="mt-6 min-w-0" aria-label="Add students">
  <button
    type="button"
    onclick={openModal}
    class="group flex min-w-0 w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--dash-cta-bg)_96%,transparent),color-mix(in_srgb,var(--whatsapp-brand)_3%,var(--dash-cta-bg)))] px-4 py-4 text-left text-[var(--dash-cta-text)] shadow-[0_8px_28px_color-mix(in_srgb,var(--whatsapp-brand)_10%,transparent)] transition-all hover:-translate-y-[1px] hover:border-[color-mix(in_srgb,var(--whatsapp-brand)_45%,var(--sh-exam-card-border))] hover:bg-[var(--dash-cta-hover-bg)] sm:min-h-[72px]"
  >
    <span class="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--whatsapp-brand)]" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block font-semibold text-[var(--dash-cta-text)]">Add Students</span>
      <span class="block text-xs text-[var(--page-text-muted)]">Upload XLSX, XLS, CSV or JSON</span>
    </span>
    <span class="shrink-0 rounded-md bg-[var(--badge-new-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--badge-new-text)]">Import</span>
    <span class="text-[var(--dash-cta-chevron)] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
  </button>
</section>

{#if modalOpen}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label="Add students file upload"
    onclick={(e) => e.target === e.currentTarget && closeModal()}
  >
    <div
      class="w-full max-w-xl rounded-2xl border border-[var(--sh-exam-card-border)] bg-[var(--sh-exam-card-bg)] p-5 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <h3 class="text-lg font-bold text-[var(--page-text)]">Add Students</h3>
      <p class="mt-1 text-sm text-[var(--page-text-muted)]">
        Browse file or drag and drop. Accepted: XLSX, XLS, CSV, JSON.
      </p>

      <button
        type="button"
        class="mt-4 w-full rounded-xl border border-[color-mix(in_srgb,var(--whatsapp-brand)_25%,var(--sh-exam-card-border))] px-4 py-7 text-left transition-colors duration-150 {dragActive ? 'bg-[var(--dash-cta-hover-bg)]' : 'bg-[color-mix(in_srgb,var(--dash-cta-bg)_85%,transparent)]'}"
        ondragenter={(e) => {
          e.preventDefault();
          dragActive = true;
        }}
        ondragover={(e) => {
          e.preventDefault();
          dragActive = true;
        }}
        ondragleave={(e) => {
          e.preventDefault();
          dragActive = false;
        }}
        ondrop={onDrop}
        onclick={openFilePicker}
      >
        <p class="text-sm font-semibold text-[var(--dash-cta-text)]">
          Click to browse or drop file here
        </p>
      </button>

      <input
        bind:this={fileInputEl}
        type="file"
        class="hidden"
        accept={ACCEPT}
        onchange={onFileChange}
      />

      {#if selectedFile}
        <div class="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[var(--sh-exam-card-border)] bg-[var(--pc-select-bg)] px-3 py-2">
          <p class="truncate text-xs text-[var(--page-text)]">{selectedFile.name}</p>
          <button
            type="button"
            class="text-xs font-medium text-[var(--page-link)] hover:underline"
            onclick={clearSelectedFile}
          disabled={submitting}
          >
            Remove
          </button>
        </div>
      {/if}

      {#if errorMessage}
        <p class="mt-3 text-xs text-[var(--pc-error-text)]">{errorMessage}</p>
      {/if}
      {#if successMessage}
        <p class="mt-3 text-xs text-emerald-500">{successMessage}</p>
      {/if}

      <div class="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-[var(--sh-exam-card-border)] px-4 py-2 text-sm font-medium text-[var(--page-text)] hover:bg-[color-mix(in_srgb,var(--dash-cta-hover-bg)_45%,transparent)]"
          onclick={closeModal}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-[var(--sh-exam-card-arrow-bg)] px-4 py-2 text-sm font-semibold text-[var(--sh-exam-card-title)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedFile || submitting}
          onclick={() => void onCreate()}
        >
          {submitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </div>
  </div>
{/if}
