<!-- <script lang="ts">
	type Chapter = {
		_id: string;
		name: {
			en: string;
			hi?: string;
		};
		order: number;
	};

	let { data } = $props<{
		data: {
			chapters: Chapter[];
			total: number;
			message: string;
		};
	}>();
</script>

<svelte:head>
	<title>JEE Main Chapters</title>
	<meta
		name="description"
		content="JEE Main chapters rendered with SSR using SvelteKit"
	/>
</svelte:head>

<div class="page">
	<div class="container">
		<div class="header">
			<h1>JEE Main Chapters</h1>
			<p>SSR Home Page • {data.message} • Total Chapters: {data.total}</p>
		</div>

		<div class="grid">
			{#each data.chapters as chapter}
				<a class="card" href={`/questions/${chapter._id}`}>
					<div class="card-top">
						<span class="badge">Order: {chapter.order}</span>
						<span class="chapter-id">{chapter._id}</span>
					</div>

					<h2>{chapter.name.en}</h2>

					{#if chapter.name.hi}
						<p class="hi-name">{chapter.name.hi}</p>
					{:else}
						<p class="empty-text">Hindi name not available</p>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #020617;
		color: white;
	}

	:global(a) {
		text-decoration: none;
		color: inherit;
	}

	.page {
		min-height: 100vh;
		background: #020617;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 16px;
	}

	.header {
		margin-bottom: 32px;
	}

	.header h1 {
		margin: 0;
		font-size: 36px;
		font-weight: 700;
	}

	.header p {
		margin-top: 10px;
		color: #cbd5e1;
		font-size: 16px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	.card {
		display: block;
		background: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 18px;
		padding: 18px;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease;
		cursor: pointer;
	}

	.card:hover {
		transform: translateY(-2px);
		border-color: #334155;
		background: #162033;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 10px;
		margin-bottom: 14px;
	}

	.badge {
		display: inline-block;
		background: rgba(37, 99, 235, 0.2);
		color: #93c5fd;
		padding: 6px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
	}

	.chapter-id {
		font-size: 11px;
		color: #94a3b8;
		word-break: break-all;
		text-align: right;
	}

	.card h2 {
		margin: 0;
		font-size: 20px;
		line-height: 1.4;
	}

	.hi-name {
		margin-top: 10px;
		color: #cbd5e1;
		font-size: 14px;
	}

	.empty-text {
		margin-top: 10px;
		color: #64748b;
		font-size: 14px;
	}
</style> -->


<!-- <script lang="ts">
	type Chapter = {
		_id: string;
		name: {
			en: string;
			hi?: string;
		};
		order: number;
	};

	let { data } = $props<{
		data: {
			chapters: Chapter[];
			total: number;
			message: string;
		};
	}>();
</script> -->
<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Welcome</title>
  <meta name="description" content="JEE Main chapters rendered with SSR using SvelteKit"/>
</svelte:head>

<div class="min-h-screen bg-[var(--topbar-page-bg)] flex items-center justify-center font-sans">
  <button
    type="button"
    onclick={() => goto('/login')}
    class="
      inline-flex items-center gap-2
      px-6 py-3 rounded-xl
      text-sm font-semibold
      bg-[linear-gradient(135deg,#8B5CF6_0%,#4f7eff_100%)]
      text-white
      shadow-[0_4px_20px_rgba(79,126,255,0.35)]
      transition-[shadow,opacity] duration-150
      hover:shadow-[0_6px_28px_rgba(79,126,255,0.50)]
      active:opacity-90
    "
  >
    Login
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>

<!-- <div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">JEE Main Chapters</h1>
			<p class="mt-2 text-base text-slate-300">
				SSR Home Page • {data.message} • Total Chapters: {data.total}
			</p>
			<p class="mt-1 text-sm text-slate-400">
				Browse all chapters and open questions chapter-wise in a clean card layout.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.chapters as chapter}
				<a
					class="block cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800"
					href={`/questions/${chapter._id}`}
				>
					<div class="mb-4 flex items-start justify-between gap-3">
						<span
							class="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300"
						>
							Order: {chapter.order}
						</span>

						<span class="break-all text-right text-[11px] text-slate-400">
							{chapter._id}
						</span>
					</div>

					<h2 class="text-xl font-semibold leading-7">
						{chapter.name.en}
					</h2>

					{#if chapter.name.hi}
						<p class="mt-2 text-sm text-slate-300">{chapter.name.hi}</p>
					{:else}
						<p class="mt-2 text-sm text-slate-500">Hindi name not available</p>
					{/if}
				</a>
			{/each}
		</div>
	</div>
</div> -->