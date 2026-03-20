import { writable, get } from 'svelte/store';
import type { Board } from '$lib/api/boards';

type BoardState = {
	boards: Board[];
};

function createBoardStore() {
	const store = writable<BoardState>({ boards: [] });

	return {
		subscribe: store.subscribe,
		setBoards(boards: Board[]) {
			store.set({ boards });
		},
		getBoardBySlug(slug: string): Board | undefined {
			return get(store).boards.find((b) => b.slug === slug);
		},
		clear() {
			store.set({ boards: [] });
		}
	};
}

export const boardStore = createBoardStore();
