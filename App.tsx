import React from "react";
import { UploadDropzone } from "./components/upload-dropzone";
import { Playlist, PlaylistItem } from "./components/playlist";
import { PlayerControls } from "./components/player-controls";
import { EmptyState } from "./components/empty-state";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { SignupDialog } from "./components/signup-dialog";
import { AuthBar } from "./components/auth-bar";
// --- Added Import for Cloud Sync ---
import { CloudSyncBar, CloudItem } from "./components/supabase-cloud";


// All your original functions and logic are self-contained in this file.
export type StoredTrack = { id: string; name: string; size: number; type: string; createdAt: number; blob: Blob; };
const DB_NAME = "audio_library_v1";
const DB_VERSION = 1;
const STORE_TRACKS = "tracks";
const STORE_STATE = "state";
function openDB(): Promise<IDBDatabase> { /* ... IndexedDB logic ... */ return new Promise((resolve, reject) => { const req = indexedDB.open(DB_NAME, DB_VERSION); req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE_TRACKS)) { db.createObjectStore(STORE_TRACKS, { keyPath: "id" }); } if (!db.objectStoreNames.contains(STORE_STATE)) { db.createObjectStore(STORE_STATE, { keyPath: "key" }); } }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
function tx<T = unknown>(db: IDBDatabase, store: string, mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) { return new Promise<T>((resolve, reject) => { const t = db.transaction(store, mode); const s = t.objectStore(store); const request = op(s); request.onsuccess = () => resolve(request.result as T); request.onerror = () => reject(request.error); }); }
export async function addFiles(files: File[]): Promise<StoredTrack[]> { if (!files.length) return []; const db = await openDB(); const toAdd: StoredTrack[] = files.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type || "audio/mpeg", createdAt: Date.now(), blob: f, })); await Promise.all(toAdd.map((item) => tx(db, STORE_TRACKS, "readwrite", (s) => s.add(item)))); const existingOrder = (await getOrder().catch(() => [])) as string[]; const newOrder = existingOrder && existingOrder.length ? [...existingOrder, ...toAdd.map((t) => t.id)] : undefined; if (newOrder) await setOrder(newOrder); return toAdd; }
export async function getAllTracks(): Promise<StoredTrack[]> { const db = await openDB(); return new Promise((resolve, reject) => { const t = db.transaction(STORE_TRACKS, "readonly"); const s = t.objectStore(STORE_TRACKS); const req = s.getAll(); req.onsuccess = () => resolve(req.result as StoredTrack[]); req.onerror = () => reject(req.error); }); }
export async function deleteTrack(id: string): Promise<void> { const db = await openDB(); await tx(db, STORE_TRACKS, "readwrite", (s) => s.delete(id)); const order = await getOrder().catch(() => [] as string[]); await setOrder(order.filter((x) => x !== id)); }
export async function setOrder(ids: string[]): Promise<void> { const db = await openDB(); await tx(db, STORE_STATE, "readwrite", (s) => s.put({ key: "order", value: ids })); }
export async function getOrder(): Promise<string[]> { const db = await openDB(); const res = await tx<{ key: string; value: string[] } | undefined>(db, STORE_STATE, "readonly", (s) => s.get("order")); return res?.value ?? []; }
export type TrackUI = { id: string; name: string; url: string; size: number; createdAt: number; };
export async function materializeTracksWithURLs(): Promise<TrackUI[]> { const [tracks, order] = await Promise.all([getAllTracks(), getOrder().catch(() => [])]); const map = new Map(tracks.map((t) => [t.id, t] as const)); const ordered = (order.length ? order : tracks.map((t) => t.id)).map((id) => map.get(id)).filter(Boolean) as StoredTrack[]; return ordered.map((t) => ({ id: t.id, name: t.name, url: URL.createObjectURL(t.blob), size: t.size, createdAt: t.createdAt, })); }


const PLAYER_STATE_KEY = "player_state_v1";

type PlayerPersist = {
  currentId?: string;
  time?: number;
  volume?: number;
  loopOne?: boolean;
  wasPlaying?: boolean;
};

export default function App() {
  const [tracks, setTracks] = React.useState<TrackUI[]>([]);
  const [currentId, setCurrentId] = React.useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [loopOne, setLoopOne] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const seekOnReadyRef = React.useRef<number | null>(null);
  const wasPlayingOnLoadRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await materializeTracksWithURLs();
      if (cancelled) return;
      setTracks(list);
      const persisted: PlayerPersist | undefined = safeRead<PlayerPersist>(PLAYER_STATE_KEY);
      if (persisted) {
        setCurrentId(persisted.currentId);
        setVolume(clamp01(persisted.volume ?? 1));
        setLoopOne(Boolean(persisted.loopOne));
        if (typeof persisted.time === "number") seekOnReadyRef.current = Math.max(0, persisted.time);
        wasPlayingOnLoadRef.current = Boolean(persisted.wasPlaying);
      } else if (list.length) {
        setCurrentId(list[0].id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => { setDuration(audio.duration || 0); if (seekOnReadyRef.current != null) { try { audio.currentTime = seekOnReadyRef.current; } catch {} seekOnReadyRef.current = null; } audio.volume = volume; if (wasPlayingOnLoadRef.current) { audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false)); wasPlayingOnLoadRef.current = false; } };
    const onTime = () => { setCurrentTime(audio.currentTime || 0); persist({ time: audio.currentTime }); };
    const onEnded = () => { if (loopOne) { audio.currentTime = 0; void audio.play(); return; } const idx = tracks.findIndex((t) => t.id === currentId); const next = idx >= 0 ? tracks[idx + 1] : undefined; if (next) { setCurrentId(next.id); setTimeout(() => setIsPlaying(true)); } else setIsPlaying(false); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    return () => { audio.removeEventListener("loadedmetadata", onLoaded); audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnded); };
  }, [tracks, currentId, loopOne, volume]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = tracks.find((t) => t.id === currentId);
    if (!track) return;
    audio.src = track.url;
    audio.load();
    persist({ currentId: track.id });
    if (isPlaying) audio.play().catch(() => {});
  }, [currentId]);

  React.useEffect(() => persist({ loopOne }), [loopOne]);
  React.useEffect(() => persist({ volume }), [volume]);
  React.useEffect(() => persist({ wasPlaying: isPlaying }), [isPlaying]);

  async function onUpload(files: File[]) {
    try {
      await addFiles(files);
      const list = await materializeTracksWithURLs();
      setTracks(list);
      if (!currentId && list.length) setCurrentId(list[0].id);
      toast.success(`Added ${files.length} file(s)`);
    } catch (e) {
      toast.error("Failed to add files");
    }
  }

  // --- Added Function to Handle Cloud Data ---
  function onCloudImport(cloudItems: CloudItem[]) {
    const newTracks = cloudItems.map(item => ({
        id: item.id,
        name: item.name,
        url: item.signedUrl || "",
        size: 0,
        createdAt: Date.now()
    }));
    setTracks(newTracks);
    if (newTracks.length) {
        setCurrentId(newTracks[0].id);
    }
  }

  function onReorder(newItems: PlaylistItem[]) {
    setTracks((prev) => { const newOrderIds = newItems.map((x) => x.id); void setOrder(newOrderIds); const map = new Map(prev.map((p) => [p.id, p])); return newOrderIds.map((id) => map.get(id)).filter(Boolean) as TrackUI[]; });
  }

  function onPlayById(id: string) { setCurrentId(id); setIsPlaying(true); }
  async function onDelete(id: string) {
    await deleteTrack(id).catch(() => toast.error("Failed to delete"));
    const list = await materializeTracksWithURLs();
    setTracks(list);
    if (currentId === id) setCurrentId(list[0]?.id);
  }

  function togglePlay() { const audio = audioRef.current; if (!audio) return; if (isPlaying) { audio.pause(); setIsPlaying(false); } else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); } }
  function onSeek(t: number) { const audio = audioRef.current; if (!audio) return; try { audio.currentTime = t; setCurrentTime(t); persist({ time: t }); } catch {} }
  function onPrev() { const idx = tracks.findIndex((t) => t.id === currentId); if (idx > 0) { setCurrentId(tracks[idx - 1].id); setIsPlaying(true); } }
  function onNext() { const idx = tracks.findIndex((t) => t.id === currentId); if (idx >= 0 && idx < tracks.length - 1) { setCurrentId(tracks[idx + 1].id); setIsPlaying(true); } }

  const activeIdx = tracks.findIndex((t) => t.id === currentId);
  const items: PlaylistItem[] = tracks.map((t, i) => ({ id: t.id, name: t.name, active: i === activeIdx && isPlaying }));
  const currentName = activeIdx >= 0 ? tracks[activeIdx].name : "";

  return (
    <div className="container">
      <header>
        <h1>Local MP3 Player</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SignupDialog />
          <AuthBar />
          <button
            className="btn"
            onClick={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              setLoopOne(false);
              setVolume(1);
              persist({ time: 0, wasPlaying: false, loopOne: false, volume: 1 });
            }}
          >
            Reset player
          </button>
        </div>
      </header>
      
      <UploadDropzone onFiles={onUpload} />
      
      {/* --- Added Cloud Sync Bar Here --- */}
      <CloudSyncBar onImport={onCloudImport} />
      
      <Toaster />

      {tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="main-grid">
          <div className="card">
            <h3>Playlist</h3>
            <p>Drag to reorder. Click play on any track.</p>
            <Playlist items={items} onReorder={onReorder} onPlay={onPlayById} onDelete={onDelete} />
          </div>
          <div className="player-column">
            <div className="card">
              <h3>Now Playing</h3>
              <p>{currentName || "Nothing selected"}</p>
              <PlayerControls
                isPlaying={isPlaying}
                canPrev={activeIdx > 0}
                canNext={activeIdx >= 0 && activeIdx < tracks.length - 1}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                loopOne={loopOne}
                onTogglePlay={togglePlay}
                onPrev={onPrev}
                onNext={onNext}
                onSeek={onSeek}
                onVolume={(v) => {
                  const audio = audioRef.current;
                  if (audio) audio.volume = clamp01(v);
                  setVolume(clamp01(v));
                }}
                onToggleLoopOne={() => setLoopOne((v) => !v)}
              />
              <audio ref={audioRef} preload="metadata" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions from your original code
function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function safeRead<T>(key: string): T | undefined { try { const raw = localStorage.getItem(key); if (!raw) return undefined; return JSON.parse(raw) as T; } catch { return undefined; } }
function persist(partial: PlayerPersist) { try { const prev = safeRead<PlayerPersist>(PLAYER_STATE_KEY) || {}; const next = { ...prev, ...partial }; localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next)); } catch {} }