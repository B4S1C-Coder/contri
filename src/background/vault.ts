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

/** An IndexedDB open that never settles must not freeze sign-in: give up after a few seconds. */
export const OPEN_TIMEOUT_MS = 5_000;

async function database(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new DOMException('IndexedDB did not open in time', 'TimeoutError')),
      OPEN_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([request(open), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function readKey(db: IDBDatabase) {
  return (await request(db.transaction(STORE).objectStore(STORE).get(KEY_ID))) as CryptoKey | undefined;
}

/** Storage problems (IndexedDB unavailable or corrupt) are thrown, never mistaken for a missing key. */
async function key(create: boolean): Promise<CryptoKey | undefined> {
  const db = await database();
  try {
    const existing = await readKey(db);
    if (existing || !create) return existing;
    const fresh = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    try {
      // add() fails if another caller stored a key first; then everyone uses that one.
      await request(db.transaction(STORE, 'readwrite').objectStore(STORE).add(fresh, KEY_ID));
      return fresh;
    } catch (error) {
      if ((error as DOMException)?.name !== 'ConstraintError') throw error;
      return readKey(db);
    }
  } finally {
    db.close();
  }
}

let creating: Promise<CryptoKey | undefined> | undefined;
/** One key per profile, even when two sign-ins are sealed at the same moment. */
function encryptionKey() {
  creating ??= key(true).finally(() => (creating = undefined));
  return creating;
}

export async function seal(text: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    (await encryptionKey())!,
    new TextEncoder().encode(text),
  );
  return { v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/**
 * Returns undefined when the key is gone or the data was altered, so the caller can sign
 * out cleanly. Throws when IndexedDB itself fails, so a temporary problem never deletes
 * the user's sign-in.
 */
export async function unseal(sealed: Sealed): Promise<string | undefined> {
  const k = await key(false);
  if (!k) return undefined;
  try {
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
