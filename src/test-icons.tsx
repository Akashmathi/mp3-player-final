import React from 'react';
import { createRoot } from 'react-dom/client';
import { Play, Pause, SkipBack, SkipForward, Repeat1 } from "lucide-react";

function Test() {
  return (
    <div>
      <h3>Icon Test</h3>
      <Play size={16} />
      <Pause size={16} />
      <SkipBack size={16} />
      <SkipForward size={16} />
      <Repeat1 size={16} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Test />);
