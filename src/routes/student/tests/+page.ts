import { browser } from '$app/environment';
import { resolveApiToken } from '$lib/api/authToken';
import {
	getTestsPageCache,
	setTestsPageCache,
	testsPageCacheKey
} from '$lib/student/tests/testsPageCache';
import type { PageData, PageLoad } from './$types';

export const load: PageLoad = async ({ data, url }) => {
	const token = browser ? (resolveApiToken() ?? null) : null;
	const key = testsPageCacheKey(url, token);

	if (browser) {
		const hit = getTestsPageCache(key);
		if (hit != null) return hit as PageData;
		setTestsPageCache(key, data);
	}

	return data;
};
