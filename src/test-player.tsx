import React from 'react';
import { createRoot } from 'react-dom/client';
import { YouTubePlayer } from "./components/youtube-player";

function Test() {
  return (
    <div>
      <h3>YouTube Player Test</h3>
      <YouTubePlayer 
        videoId="dQw4w9WgXcQ" 
        isPlaying={false}
        volume={100}
        onTimeUpdate={() => {}}
        onDurationChange={() => {}}
        onEnded={() => {}} 
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Test />);
