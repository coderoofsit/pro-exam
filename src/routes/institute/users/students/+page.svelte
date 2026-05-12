<script lang="ts">
	import InstituteUsersList from '$lib/components/InstituteUsersList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<InstituteUsersList
	variant="students"
	pageTitle="Students Management"
	ssrAuthMissing={data.ssrAuthMissing}
	streamedList={data.streamed.usersList}
/>
