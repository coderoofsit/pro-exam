import type { PageServerLoad } from './$types';
import { loadSettingsProfile } from '$lib/server/loadSettingsProfile';

export const load: PageServerLoad = async ({ cookies, fetch }) => loadSettingsProfile(cookies, fetch);
