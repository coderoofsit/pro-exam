<script lang="ts">
	import type { Board } from '$lib/api/boards';

	let { boards }: { boards: Board[] } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">Boards</h1>
			<p class="mt-2 text-sm text-slate-400">Select a board to explore its exams</p>
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each boards as board}
				<a
					href={`/boards/${board.slug}`}
					class="block rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800"
				>
					{#if board.image}
						<img
							src={board.image}
							alt={board.name.en}
							class="mb-4 h-16 w-full rounded-xl object-cover"
						/>
					{:else}
						<div class="mb-4 flex h-16 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-slate-500">
							{board.name.en[0]}
						</div>
					{/if}

					<div class="flex items-start justify-between gap-2">
						<div>
							<h2 class="text-lg font-semibold leading-tight">{board.name.en}</h2>
							{#if board.name.hi}
								<p class="mt-1 text-sm text-slate-400">{board.name.hi}</p>
							{/if}
						</div>
						<span class="shrink-0 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300">
							{board.numberofExams} exams
						</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
