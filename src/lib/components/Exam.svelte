<script lang="ts">
	import type { Exam } from '$lib/api/exams';

	let { exams, boardName }: { exams: Exam[]; boardName: string } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto max-w-7xl px-4 py-10">
		<a href="/boards" class="mb-6 inline-block text-sm text-slate-400 hover:text-white">← Back to Boards</a>

		<div class="mb-8">
			<h1 class="text-3xl font-bold md:text-4xl">{boardName} Exams</h1>
			<p class="mt-2 text-sm text-slate-400">{exams.length} exam{exams.length !== 1 ? 's' : ''} available</p>
		</div>

		{#if exams.length === 0}
			<p class="text-slate-500">No exams found for this board.</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each exams as exam}
					<div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
						{#if exam.image}
							<img src={exam.image} alt={exam.name.en} class="mb-4 h-16 w-full rounded-xl object-cover" />
						{:else}
							<div class="mb-4 flex h-16 items-center justify-center rounded-xl bg-slate-800 text-2xl font-bold text-slate-500">
								{exam.name.en[0]}
							</div>
						{/if}

						<div class="flex items-start justify-between gap-2">
							<div>
								<h2 class="text-lg font-semibold leading-tight">{exam.name.en}</h2>
								{#if exam.name.hi}
									<p class="mt-1 text-sm text-slate-400">{exam.name.hi}</p>
								{/if}
							</div>
						</div>
						<div class="mt-4 grid grid-cols-2 gap-2">
							<a
								href={`/boards/${exam.boardSlug}/${exam.slug}/chapters`}
								class="rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-500"
							>
								Chapter Wise
							</a>
							<a
								href={`/boards/${exam.boardSlug}/${exam.slug}/papers`}
								class="rounded-lg bg-slate-700 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-600"
							>
								Paper Wise
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
