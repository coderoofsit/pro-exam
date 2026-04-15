import { writable } from 'svelte/store';

/** One-shot callback after Add Phone modal verifies (e.g. resume subscription checkout). */
export const afterPhoneVerifiedAction = writable<null | (() => void | Promise<void>)>(null);
