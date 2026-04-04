import { useState, useEffect, useRef } from "react";
import { UploadDropzone } from "./components/upload-dropzone";
import { Playlist } from "./components/playlist";
import type { PlaylistItem } from "./components/playlist";
import { PlayerControls } from "./components/player-controls";
import { EmptyState } from "./components/empty-state";
import { Toaster } from "./components/ui/sonner";
import { createRoot } from 'react-dom/client';
import React from 'react';

// Minimal App for testing
export default function App() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div className="container">
      <header>
        <h1>Local MP3 Player (Test)</h1>
      </header>
      
      <UploadDropzone onFiles={() => {}} />
      <Toaster />

      {tracks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="main-grid">
          <Playlist items={[]} onReorder={() => {}} onPlay={() => {}} onDelete={() => {}} />
          <PlayerControls
            isPlaying={isPlaying}
            canPrev={false}
            canNext={false}
            currentTime={0}
            duration={0}
            volume={1}
            loopOne={false}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onPrev={() => {}}
            onNext={() => {}}
            onSeek={() => {}}
            onVolume={() => {}}
            onToggleLoopOne={() => {}}
          />
          <audio ref={audioRef} />
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
