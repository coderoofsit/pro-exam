import { fromStore } from 'svelte/store';
import { examStore } from '$lib/stores/exam';
import { authStore } from '$lib/stores/auth';
import { fetchExamsPage } from '$lib/api/exams';
import type { Exam } from '$lib/api/exams';

const PAGE = 1;
const FETCH_LIMIT = 8;

export function createDashboardExamState() {
	const auth = fromStore(authStore);
	const exams = fromStore(examStore);

	let loading = $state(false);
	let error = $state<string | null>(null);

	const token = $derived(
		auth.current.token?.startsWith('Bearer ') ? auth.current.token.slice(7) : auth.current.token
	);

	const page1Exams = $derived(exams.current.examsByPage[PAGE] ?? []);
	const displayExams = $derived(page1Exams.slice(0, 4) as Exam[]);
	const hasPage1 = $derived(PAGE in exams.current.examsByPage);

	$effect(() => {
		if (examStore.hasPage(PAGE) || loading) return;
		loading = true;
		error = null;
		fetchExamsPage(PAGE, FETCH_LIMIT, token ?? undefined)
			.then((res) => {
				examStore.setExamsPage(PAGE, res.data, {
					total: res.total,
					lastPage: res.lastPage,
					limit: res.limit
				});
			})
			.catch((e) => {
				error = e instanceof Error ? e.message : 'Failed to fetch exams';
			})
			.finally(() => {
				loading = false;
			});
	});

	return {
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get displayExams() {
			return displayExams;
		},
		get hasPage1() {
			return hasPage1;
		}
	};
}
