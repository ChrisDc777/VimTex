const DB_NAME = "vimtex";
const DB_VERSION = 1;
const STORE_NAME = "reference-images";

type ReferenceRecord = {
  roomId: string;
  blob: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "roomId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("IndexedDB request failed"));

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
      }),
  );
}

export async function loadReferenceImage(roomId: string): Promise<Blob | null> {
  try {
    const record = await withStore<ReferenceRecord | undefined>(
      "readonly",
      (store) => store.get(roomId),
    );
    return record?.blob ?? null;
  } catch {
    return null;
  }
}

export async function saveReferenceImage(
  roomId: string,
  blob: Blob,
): Promise<void> {
  try {
    await withStore("readwrite", (store) =>
      store.put({ roomId, blob } satisfies ReferenceRecord),
    );
  } catch {
    // Quota or private browsing — ignore.
  }
}

export async function clearReferenceImage(roomId: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(roomId));
  } catch {
    // ignore
  }
}
