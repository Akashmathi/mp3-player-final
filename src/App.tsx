import { useState, useEffect, useRef } from "react";
import { UploadDropzone } from "./components/upload-dropzone";
import { Playlist } from "./components/playlist";
import type { PlaylistItem } from "./components/playlist";
import { PlayerControls } from "./components/player-controls";
import { EmptyState } from "./components/empty-state";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { SignupDialog } from "./components/signup-dialog";
import { AuthBar } from "./components/auth-bar";
// --- Added Import for Cloud Sync ---
import { CloudSyncBar } from "./components/supabase-cloud";
import type { CloudItem } from "./components/supabase-cloud";
import { YouTubeSearch } from "./components/youtube-search";
import { YouTubePlayer } from "./components/youtube-player";


import { 
  addFiles, 
  getAllTracks, 
  deleteTrack, 
  setOrder, 
  getOrder, 
  materializeTracksWithURLs, 
  addYouTubeTrack 
} from "./lib/db";
import type { TrackUI } from "./lib/db";

const PLAYER_STATE_KEY = "player_state_v1";

type PlayerPersist = {
  currentId?: string;
  time?: number;
  volume?: number;
  loopOne?: boolean;
  wasPlaying?: boolean;
};

export default function App() {
  const [tracks, setTracks] = useState<TrackUI[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopOne, setLoopOne] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekOnReadyRef = useRef<number | null>(null);
  const wasPlayingOnLoadRef = useRef(false);

  useEffect(() => {
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

  useEffect(() => {
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = tracks.find((t) => t.id === currentId);
    if (!track || track.yt_id) {
       audio.src = "";
       return;
    }
    audio.src = track.url;
    audio.load();
    persist({ currentId: track.id });
    if (isPlaying) audio.play().catch(() => {});
  }, [currentId, tracks]);

  useEffect(() => persist({ loopOne }), [loopOne]);
  useEffect(() => persist({ volume }), [volume]);
  useEffect(() => persist({ wasPlaying: isPlaying }), [isPlaying]);

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
    setTracks(prev => [...newTracks, ...prev]);
    if (newTracks.length) {
        setCurrentId(newTracks[0].id);
    }
  }

  async function onYouTubeSelect(trackData: { title: string; artist: string; yt_id: string; thumbnail: string }, playNow: boolean) {
    try {
      await addYouTubeTrack(trackData);
      const list = await materializeTracksWithURLs();
      setTracks(list);
      if (playNow) {
        const newId = `yt-${trackData.yt_id}`;
        setCurrentId(newId);
        setIsPlaying(true);
      }
      toast.success(`${playNow ? 'Playing' : 'Added'} ${trackData.title}`);
    } catch (e) {
      toast.error("Failed to add YouTube track");
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

  function togglePlay() { 
    const track = tracks.find(t => t.id === currentId);
    if (track?.yt_id) {
      setIsPlaying(!isPlaying);
      return;
    }
    const audio = audioRef.current; 
    if (!audio) return; 
    if (isPlaying) { 
      audio.pause(); 
      setIsPlaying(false); 
    } else { 
      audio.play().then(() => setIsPlaying(true)).catch(() => {}); 
    } 
  }
  function onSeek(t: number) { 
    const track = tracks.find(t => t.id === currentId);
    if (track?.yt_id) {
      setSeekTime(t);
      setCurrentTime(t);
      // Reset seekTime after a short delay to allow re-triggering same value
      setTimeout(() => setSeekTime(null), 100);
      return;
    }
    const audio = audioRef.current; 
    if (!audio) return; 
    try { 
      audio.currentTime = t; 
      setCurrentTime(t); 
      persist({ time: t }); 
    } catch {} 
  }
  function onPrev() { 
    const idx = tracks.findIndex((t) => t.id === currentId); 
    if (idx > 0) { 
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentId(tracks[idx - 1].id); 
        setIsPlaying(true); 
      }, 50);
    } 
  }
  function onNext() { 
    const idx = tracks.findIndex((t) => t.id === currentId); 
    if (idx >= 0 && idx < tracks.length - 1) { 
      setIsPlaying(false);
      setTimeout(() => {
        setCurrentId(tracks[idx + 1].id); 
        setIsPlaying(true); 
      }, 50);
    } 
  }

  const activeIdx = tracks.findIndex((t) => t.id === currentId);
  const items: PlaylistItem[] = tracks.map((t, i) => ({ 
    id: t.id, 
    name: t.name, 
    active: i === activeIdx && isPlaying,
    thumbnail: t.thumbnail
  }));
  const currentName = activeIdx >= 0 ? tracks[activeIdx].name : "";

  return (
    <div className="container">
      <header>
        <h1>Local MP3 Player</h1>
        <div className="header-actions">
          <SignupDialog />
          <AuthBar />
          <YouTubeSearch onSelect={onYouTubeSelect} />
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
                onVolume={(v: number) => {
                  const audio = audioRef.current;
                  if (audio) audio.volume = clamp01(v);
                  setVolume(clamp01(v));
                }}
                onToggleLoopOne={() => setLoopOne((v: boolean) => !v)}
              />
              <audio ref={audioRef} preload="metadata" />
              {tracks.find(t => t.id === currentId)?.yt_id && (
                <YouTubePlayer
                  videoId={tracks.find(t => t.id === currentId)!.yt_id!}
                  isPlaying={isPlaying}
                  volume={volume}
                  seekTime={seekTime}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onEnded={onNext}
                />
              )}
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