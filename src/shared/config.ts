/**
 * Client ID of the CONTRI GitHub OAuth App (device flow enabled). Client IDs are
 * public by design — the device flow needs no client secret and no backend.
 *
 * Set VITE_GITHUB_CLIENT_ID at build time (see README → "Sign in with GitHub").
 * When it is empty, Settings falls back to the fine-grained token walkthrough.
 */
export const GITHUB_CLIENT_ID: string = (import.meta.env?.VITE_GITHUB_CLIENT_ID as string | undefined) ?? '';

export const PRODUCT = 'CONTRI';
export const REPO_URL = 'https://github.com/alphasafal/contri';
