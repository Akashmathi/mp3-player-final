import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Music2, Search, X, ListMusic, Plus, Download, Trash2 
} from "lucide-react";
import { Toaster } from "../components/ui/sonner";
import { UploadDropzone } from "./upload-dropzone";
import { Playlist } from "./playlist";
import type { PlaylistItem } from "./playlist";
import { PlayerControls } from "./player-controls";
import { EmptyState } from "./empty-state";
import { SignupDialog } from "./signup-dialog";
import { AuthBar } from "./auth-bar";
import { CloudSyncBar } from "./supabase-cloud";
import type { CloudItem } from "./supabase-cloud";
import { YouTubePlayer } from "./youtube-player";
import { YouTubeSearch } from "./youtube-search";
import type { TrackUI } from "../lib/db";

interface PlayerDashboardProps {
  tracks: TrackUI[];
  currentId: string | undefined;
  isPlaying: boolean;
  loopOne: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  seekTime: number | null;
  showSearch: boolean;
  search: string;
  setSearch: (val: string) => void;
  setShowSearch: (val: boolean) => void;
  togglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
  onToggleLoopOne: () => void;
  onUpload: (files: File[]) => void;
  onCloudImport: (items: CloudItem[]) => void;
  onYouTubeSelect: (track: any, playNow: boolean) => void;
  onReorder: (items: PlaylistItem[]) => void;
  onPlayById: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export function PlayerDashboard({
  tracks,
  currentId,
  isPlaying,
  loopOne,
  volume,
  currentTime,
  duration,
  seekTime,
  showSearch,
  search,
  setSearch,
  setShowSearch,
  togglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onToggleLoopOne,
  onUpload,
  onCloudImport,
  onYouTubeSelect,
  onReorder,
  onPlayById,
  onDelete,
  onClear,
  onExport,
  audioRef
}: PlayerDashboardProps) {
  const activeIdx = tracks.findIndex((t) => t.id === currentId);
  const items: PlaylistItem[] = tracks.map((t, i) => ({
    id: t.id,
    name: t.name,
    active: i === activeIdx && isPlaying,
    thumbnail: t.thumbnail,
  }));
  const currentTrack = tracks.find((t) => t.id === currentId);
  const currentName = currentTrack?.name || "";

  const filteredTracks = tracks.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
        <nav className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] transition-transform group-hover:scale-105">
                <Music2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Midnight <span className="text-indigo-400">Chrome</span>
                </h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium leading-none">
                  Ultimate Music Experience
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <AuthBar />
              </div>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all active:scale-95"
                title="Search Music"
              >
                {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/5 space-y-6">
              <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl transition-all hover:border-zinc-700/50">
                <YouTubePlayer
                  videoId={currentTrack?.yt_id || ""}
                  isPlaying={isPlaying && !!currentTrack?.yt_id}
                  volume={volume}
                  seekTime={seekTime}
                  onTimeUpdate={onSeek} // This might need a separate handler if it's auto-update vs manual seek
                  onDurationChange={() => {}} // Handle properly if needed
                  onEnded={onNext}
                />
                {!currentTrack?.yt_id && (
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
                    onVolume={onVolume}
                    onToggleLoopOne={onToggleLoopOne}
                  />
                )}
                {/* Always render audio tag for local files */}
                <audio ref={audioRef} preload="metadata" />
                
                {/* Specific display if it's playing YT */}
                {currentTrack?.yt_id && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-lg truncate pr-4">{currentName}</h3>
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded uppercase">YouTube</span>
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
                      onVolume={onVolume}
                      onToggleLoopOne={onToggleLoopOne}
                    />
                  </div>
                )}
              </div>

              <CloudSyncBar onImport={onCloudImport} />

              {showSearch && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1">
                    <YouTubeSearch onSelect={onYouTubeSelect} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl overflow-hidden h-full flex flex-col transition-all hover:border-zinc-700/50">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <ListMusic className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Your Library</h2>
                      <p className="text-xs text-zinc-500">{tracks.length} tracks available</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 w-32 sm:w-48 pl-9 pr-4 rounded-full bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                    <label className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95">
                      <Plus className="h-5 w-5" />
                      <input type="file" multiple accept="audio/*" onChange={(e) => {
                        if (e.target.files) onUpload(Array.from(e.target.files));
                      }} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="p-4 flex-1">
                  {tracks.length > 0 ? (
                    <Playlist
                      items={items}
                      onReorder={onReorder}
                      onPlay={onPlayById}
                      onDelete={onDelete}
                    />
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl m-4">
                      <Music2 className="h-10 w-10 mb-3 opacity-20" />
                      <p>Your library is empty</p>
                      <button
                        onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                        className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        Add some music
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/50 flex justify-end gap-3">
                  <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export JSON
                  </button>
                  <button
                    onClick={onClear}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Toaster theme="dark" position="bottom-right" />
      </div>
    </DndProvider>
  );
}
