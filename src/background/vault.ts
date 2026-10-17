/**
 * Encrypts the remembered GitHub credential at rest. The Chrome Web Store user data
 * policy asks for stored user data to use strong encryption such as AES.
 *
 * The AES-GCM key is a non-extractable WebCrypto key kept in this extension's own
 * IndexedDB: script cannot read its raw bytes, and neither GitHub pages nor content
 * scripts can reach extension storage. Session-only sign-ins live in memory
 * (chrome.storage.session) and are not written to disk, so they are not sealed.
 */

export type Sealed = { v: 1; iv: string; data: string };

const DB = 'contri-vault';
const STORE = 'keys';
const KEY_ID = 'credential';

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export const isSealed = (value: unknown): value is Sealed =>
  Boolean(value) &&
  typeof value === 'object' &&
  (value as Sealed).v === 1 &&
  typeof (value as Sealed).iv === 'string' &&
  typeof (value as Sealed).data === 'string';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function database(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE);
  return request(open);
}

async function key(create: boolean): Promise<CryptoKey | undefined> {
  const db = await database();
  try {
    const existing = (await request(db.transaction(STORE).objectStore(STORE).get(KEY_ID))) as CryptoKey | undefined;
    if (existing || !create) return existing;
    const fresh = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(fresh, KEY_ID));
    return fresh;
  } finally {
    db.close();
  }
}

export async function seal(text: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, (await key(true))!, new TextEncoder().encode(text));
  return { v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** Returns undefined when the key is gone or the data was altered, so the caller can sign out cleanly. */
export async function unseal(sealed: Sealed): Promise<string | undefined> {
  try {
    const k = await key(false);
    if (!k) return undefined;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(sealed.iv) },
      k,
      fromBase64(sealed.data),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return undefined;
  }
}
