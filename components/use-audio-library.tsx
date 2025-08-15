// Local audio library powered by IndexedDB. Stores MP3 blobs and basic metadata.
// Exposes simple CRUD functions and playlist order persistence.

export type StoredTrack = {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: number;
  blob: Blob;
};

const DB_NAME = "audio_library_v1";
const DB_VERSION = 1;
const STORE_TRACKS = "tracks";
const STORE_STATE = "state"; // for order and misc

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T = unknown>(db: IDBDatabase, store: string, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const request = op(s);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export async function addFiles(files: File[]): Promise<StoredTrack[]> {
  if (!files.length) return [];
  const db = await openDB();
  const toAdd: StoredTrack[] = files.map((f) => ({
    id: crypto.randomUUID(),
    name: f.name,
    size: f.size,
    type: f.type || "audio/mpeg",
    createdAt: Date.now(),
    blob: f,
  }));

  await Promise.all(
    toAdd.map((item) =>
      tx(db, STORE_TRACKS, "readwrite", (s) => s.add(item))
    )
  );

  const existingOrder = (await getOrder().catch(() => [])) as string[];
  const newOrder = existingOrder && existingOrder.length ? [...existingOrder, ...toAdd.map((t) => t.id)] : undefined;
  if (newOrder) await setOrder(newOrder);

  return toAdd;
}

export async function getAllTracks(): Promise<StoredTrack[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE_TRACKS, "readonly");
    const s = t.objectStore(STORE_TRACKS);
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result as StoredTrack[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTrack(id: string): Promise<void> {
  const db = await openDB();
  await tx(db, STORE_TRACKS, "readwrite", (s) => s.delete(id));
  const order = await getOrder().catch(() => [] as string[]);
  await setOrder(order.filter((x) => x !== id));
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  await tx(db, STORE_TRACKS, "readwrite", (s) => s.clear());
  await setOrder([]);
}

export async function setOrder(ids: string[]): Promise<void> {
  const db = await openDB();
  await tx(db, STORE_STATE, "readwrite", (s) => s.put({ key: "order", value: ids }));
}

export async function getOrder(): Promise<string[]> {
  const db = await openDB();
  const res = await tx<{ key: string; value: string[] } | undefined>(db, STORE_STATE, "readonly", (s) => s.get("order"));
  return res?.value ?? [];
}

export type TrackUI = {
  id: string;
  name: string;
  url: string; // object URL
  size: number;
  createdAt: number;
};

export async function materializeTracksWithURLs(): Promise<TrackUI[]> {
  const [tracks, order] = await Promise.all([getAllTracks(), getOrder().catch(() => [])]);
  const map = new Map(tracks.map((t) => [t.id, t] as const));
  const ordered = (order.length ? order : tracks.map((t) => t.id))
    .map((id) => map.get(id))
    .filter(Boolean) as StoredTrack[];
  return ordered.map((t) => ({
    id: t.id,
    name: t.name,
    url: URL.createObjectURL(t.blob),
    size: t.size,
    createdAt: t.createdAt,
  }));
}