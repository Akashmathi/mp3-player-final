import React from "react";
import { UploadDropzone } from "./components/upload-dropzone";
import { Playlist, PlaylistItem } from "./components/playlist";
import { PlayerControls } from "./components/player-controls";
import { EmptyState } from "./components/empty-state";
import { Button } from "./components/ui/button";
import { addFiles, materializeTracksWithURLs, deleteTrack, setOrder, type TrackUI } from "./components/use-audio-library";
import { CloudSyncBar, cloudUpload, cloudSavePlaylist, type CloudItem } from "./components/supabase-cloud";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";
import { AuthBar } from "./components/auth-bar";
import { SignupDialog } from "./components/signup-dialog";
import { supabase } from "./components/supabase-client";

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

  // Load library and player state
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
    return () => {
      cancelled = true;
      // Revoke object URLs to free memory
      try {
        tracks.forEach((t) => URL.revokeObjectURL(t.url));
      } catch {}
    };
  }, []);

  // Wire up audio element events
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      if (seekOnReadyRef.current != null) {
        try {
          audio.currentTime = seekOnReadyRef.current;
        } catch {}
        seekOnReadyRef.current = null;
      }
      audio.volume = volume;
      if (wasPlayingOnLoadRef.current) {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        wasPlayingOnLoadRef.current = false;
      }
    };

    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      persist({ time: audio.currentTime });
    };

    const onEnded = () => {
      if (loopOne) {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      const idx = tracks.findIndex((t) => t.id === currentId);
      const next = idx >= 0 ? tracks[idx + 1] : undefined;
      if (next) {
        setCurrentId(next.id);
        // will auto play in effect below if already playing
        setTimeout(() => setIsPlaying(true));
      } else {
        setIsPlaying(false);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [tracks, currentId, loopOne, volume]);

  // When current track changes, load it
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = tracks.find((t) => t.id === currentId);
    if (!track) return;
    audio.src = track.url;
    audio.load();
    // Persist current id
    persist({ currentId: track.id });
    // If user had pressed play, continue playing
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentId]);

  // Persist loop/volume/playing state
  React.useEffect(() => persist({ loopOne }), [loopOne]);
  React.useEffect(() => persist({ volume }), [volume]);
  React.useEffect(() => persist({ wasPlaying: isPlaying }), [isPlaying]);

  async function onUpload(files: File[]) {
    try {
      // Save locally first (IndexedDB)
      await addFiles(files);
      const list = await materializeTracksWithURLs();
      setTracks(list);
      if (!currentId && list.length) setCurrentId(list[0].id);
      toast.success(`Added ${files.length} file(s) locally`);

      // Optional: also back up to cloud (best-effort). We silently ignore errors.
      try {
        const cloudItems: CloudItem[] = [];
        for (const t of files) {
          const id = crypto.randomUUID();
          const uploaded = await cloudUpload(id, t.name, t);
          cloudItems.push(uploaded);
        }
        if (cloudItems.length) {
          await cloudSavePlaylist(cloudItems, cloudItems.map((c) => c.id));
          toast.success("Backed up to cloud");
        }
      } catch (e) {
        console.warn("Cloud backup failed", e);
      }
    } catch (e) {
      toast.error("Failed to add files");
    }
  }

  function onReorder(newItems: PlaylistItem[]) {
    setTracks((prev) => {
      const newOrderIds = newItems.map((x) => x.id);
      void setOrder(newOrderIds);
      const map = new Map(prev.map((p) => [p.id, p] as const));
      const merged: TrackUI[] = [];
      newOrderIds.forEach((id) => {
        const t = map.get(id);
        if (t) merged.push(t);
      });
      // Keep current playing by id
      if (currentId && !merged.find((t) => t.id === currentId) && prev.find((t) => t.id === currentId)) {
        // In case currentId disappeared (deleted), ignore here; delete handles it
        setCurrentId(undefined);
      }
      return merged;
    });
  }

  function onPlayById(id: string) {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentId(id);
    setIsPlaying(true);
    // audio will start in effect
  }

  async function onDelete(id: string) {
    await deleteTrack(id).catch(() => toast.error("Failed to delete"));
    const list = await materializeTracksWithURLs();
    setTracks(list);
    if (currentId === id) {
      const idx = list.findIndex((t) => t.id === id);
      const next = list[idx] || list[idx - 1] || list[0];
      if (next) setCurrentId(next.id);
      else setCurrentId(undefined);
    }
  }

  function togglePlay() {
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
      setCurrentId(tracks[idx - 1].id);
      setIsPlaying(true);
    }
  }

  function onNext() {
    const idx = tracks.findIndex((t) => t.id === currentId);
    if (idx >= 0 && idx < tracks.length - 1) {
      setCurrentId(tracks[idx + 1].id);
      setIsPlaying(true);
    }
  }

  const activeIdx = tracks.findIndex((t) => t.id === currentId);
  const items: PlaylistItem[] = tracks.map((t, i) => ({ id: t.id, name: t.name, active: i === activeIdx && isPlaying }));

  const currentName = activeIdx >= 0 ? tracks[activeIdx].name : "";

  return (
    <div className="min-h-dvh max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1>Local MP3 Player</h1>
        <div className="flex items-center gap-2">
          <SignupDialog />
          <AuthBar />
          <Button
            variant="outline"
            onClick={() => {
              // Just reset UI state; library persists until user deletes
              setIsPlaying(false);
              setCurrentTime(0);
              setLoopOne(false);
              setVolume(1);
              persist({ time: 0, wasPlaying: false, loopOne: false, volume: 1 });
            }}
          >
            Reset player
          </Button>
        </div>
      </header>

      <UploadDropzone onFiles={onUpload} />

      <CloudSyncBar onImport={(cloudItems) => {
        setTracks(
          cloudItems.map((c) => ({ id: c.id, name: c.name, url: c.signedUrl || "", size: 0, createdAt: Date.now() }))
        );
        if (cloudItems.length) setCurrentId(cloudItems[0].id);
      }} />
      <Toaster />

      {tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="mb-3">
              <h3>Playlist</h3>
              <p className="text-muted-foreground">Drag to reorder. Click play on any track. Songs are saved locally; optional cloud backup available above.</p>
            </div>
            <Playlist items={items} onReorder={onReorder} onPlay={onPlayById} onDelete={onDelete} />
          </div>
          <div className="md:col-span-1">
            <div className="rounded-lg border p-4 sticky top-4">
              <div className="mb-3">
                <h3>Now Playing</h3>
                <p className="text-muted-foreground truncate">{currentName || "Nothing selected"}</p>
              </div>
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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function safeRead<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function persist(partial: PlayerPersist) {
  try {
    const prev = safeRead<PlayerPersist>(PLAYER_STATE_KEY) || {};
    const next = { ...prev, ...partial };
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(next));
  } catch {}
}
