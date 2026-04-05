import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { 
  addFiles, 
  getAllTracks, 
  materializeTracksWithURLs, 
  deleteTrack, 
  setOrder, 
  addYouTubeTrack 
} from "./lib/db";
import type { TrackUI } from "./lib/db";
import { PlayerDashboard } from "./components/player-dashboard";
import type { PlaylistItem } from "./components/playlist";
import type { CloudItem } from "./components/supabase-cloud";

const STORAGE_KEY = "midnight-chrome-state";

export default function App() {
  console.log("App component: rendering started");
  const [tracks, setTracks] = useState<TrackUI[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loopOne, setLoopOne] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const seekOnReadyRef = useRef<number | null>(null);
  const wasPlayingOnLoadRef = useRef(false);

  // Restore state
  useEffect(() => {
    async function init() {
      const all = await getAllTracks();
      const list = await materializeTracksWithURLs();
      setTracks(list);

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const { currentId, time, wasPlaying, loopOne, volume } = JSON.parse(saved);
          if (currentId) setCurrentId(currentId);
          if (time) seekOnReadyRef.current = time;
          if (wasPlaying) wasPlayingOnLoadRef.current = wasPlaying;
          if (loopOne !== undefined) setLoopOne(loopOne);
          if (volume !== undefined) setVolume(volume);
        } catch (e) {}
      }
    }
    init();
  }, []);

  function persist(patch: any) {
    const saved = localStorage.getItem(STORAGE_KEY);
    const current = saved ? JSON.parse(saved) : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      if (seekOnReadyRef.current != null) {
        try {
          audio.currentTime = seekOnReadyRef.current;
        } catch (e) {
          console.error("Seek failed", e);
        }
        seekOnReadyRef.current = null;
      }
      audio.volume = volume;
      if (wasPlayingOnLoadRef.current) {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
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
        setTimeout(() => setIsPlaying(true));
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
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
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentId, tracks]);

  useEffect(() => persist({ loopOne }), [loopOne]);
  useEffect(() => persist({ volume }), [volume]);
  useEffect(() => persist({ wasPlaying: isPlaying }), [isPlaying]);

  async function onUpload(files: File[]) {
    try {
      await addFiles(files);
      const list = await materializeTracksWithURLs();
      setTracks(list);
      if (!currentId && list.length) {
        setCurrentId(list[0].id);
      }
      toast.success(`Added ${files.length} file(s)`);
    } catch (e) {
      toast.error("Failed to add files");
    }
  }

  function onCloudImport(cloudItems: CloudItem[]) {
    const newTracks: TrackUI[] = cloudItems.map(item => ({
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

  async function onYouTubeSelect(trackData: any, playNow: boolean) {
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
    setTracks((prev) => {
      const newOrderIds = newItems.map((x) => x.id);
      void setOrder(newOrderIds);
      const map = new Map(prev.map((p) => [p.id, p]));
      return newOrderIds
        .map((id) => map.get(id))
        .filter(Boolean) as TrackUI[];
    });
  }

  function onPlayById(id: string) {
    setCurrentId(id);
    setIsPlaying(true);
  }

  async function onDelete(id: string) {
    try {
      await deleteTrack(id);
      const list = await materializeTracksWithURLs();
      setTracks(list);
      if (currentId === id) {
        setCurrentId(list[0]?.id);
      }
    } catch (e) {
      toast.error("Failed to delete");
    }
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
      setTimeout(() => setSeekTime(null), 100);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = t;
      setCurrentTime(t);
      persist({ time: t });
    } catch (e) {}
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

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  return (
    <PlayerDashboard
      tracks={tracks}
      currentId={currentId}
      isPlaying={isPlaying}
      loopOne={loopOne}
      volume={volume}
      currentTime={currentTime}
      duration={duration}
      seekTime={seekTime}
      showSearch={showSearch}
      search={search}
      setSearch={setSearch}
      setShowSearch={setShowSearch}
      togglePlay={togglePlay}
      onPrev={onPrev}
      onNext={onNext}
      onSeek={onSeek}
      onVolume={(v: number) => {
        const audio = audioRef.current;
        if (audio) audio.volume = clamp01(v);
        setVolume(clamp01(v));
      }}
      onToggleLoopOne={() => setLoopOne((v: boolean) => !v)}
      onUpload={onUpload}
      onCloudImport={onCloudImport}
      onYouTubeSelect={onYouTubeSelect}
      onReorder={onReorder}
      onPlayById={onPlayById}
      onDelete={onDelete}
      onClear={async () => {
         // Add clear logic if needed
      }}
      onExport={() => {
         // Add export logic if needed
      }}
      audioRef={audioRef}
    />
  );
}