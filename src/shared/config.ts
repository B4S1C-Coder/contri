/**
 * Client ID of the CONTRI GitHub OAuth App (owned by @alphasafal, device flow enabled,
 * no scopes, non-expiring tokens). Client IDs are public by design: the device flow
 * needs no client secret and no backend.
 *
 * A fork can use its own OAuth App with VITE_GITHUB_CLIENT_ID=<client id> at build time,
 * or VITE_GITHUB_CLIENT_ID=none to offer only the personal access token walkthrough.
 */
export const CONTRI_OAUTH_CLIENT_ID = 'Ov23liqTB6n54MCQKWzi';

const configured = (import.meta.env?.VITE_GITHUB_CLIENT_ID as string | undefined)?.trim();
export const GITHUB_CLIENT_ID: string = configured === 'none' ? '' : configured || CONTRI_OAUTH_CLIENT_ID;

export const PRODUCT = 'CONTRI';
export const REPO_URL = 'https://github.com/alphasafal/contri';
export const WEBSITE_URL = 'https://contri-two.vercel.app';
