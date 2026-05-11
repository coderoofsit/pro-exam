<script lang="ts">
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>{page.status === 404 ? "404 - Page Not Found" : "Something Went Wrong"}</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6 text-[var(--page-text)]">
  <section class="w-full max-w-xl rounded-2xl border border-[var(--page-card-border)] bg-[var(--page-card-bg)] p-8 text-center">
    <p class="text-4xl font-bold">{page.status}</p>
    <h1 class="mt-2 text-2xl font-semibold">
      {page.status === 404 ? "Page Not Found" : "Unexpected Error"}
    </h1>
    <p class="mt-3 text-sm text-[var(--page-text-muted)]">
      {#if page.status === 404}
        The page you are looking for does not exist.
      {:else}
        Something went wrong while loading this page.
      {/if}
    </p>
    <a
      href="/"
      class="mt-6 inline-flex rounded-lg border border-[var(--page-link)] px-4 py-2 text-sm font-medium text-[var(--page-link)] transition hover:bg-[color-mix(in_srgb,var(--page-link)_15%,transparent)]"
    >
      Go to Home
    </a>
  </section>
</main>
