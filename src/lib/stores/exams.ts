import { writable } from 'svelte/store';
import type { Exam } from '$lib/api/exams';

type ExamState = {
  exams: Exam[];
  loaded: boolean;
};

const initialState: ExamState = {
  exams: [],
  loaded: false
};

function createExamStore() {
  const { subscribe, set, update } = writable<ExamState>(initialState);

  return {
    subscribe,

    setExams(exams: Exam[]) {
      set({
        exams,
        loaded: true
      });
    },

    clear() {
      set(initialState);
    },

    markLoaded() {
      update((state) => ({
        ...state,
        loaded: true
      }));
    }
  };
}

export const examStore = createExamStore();