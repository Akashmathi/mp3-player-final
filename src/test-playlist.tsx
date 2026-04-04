import React from 'react';
import { createRoot } from 'react-dom/client';
import { Playlist } from "./components/playlist";

const items = [
  { id: '1', name: 'Song 1', active: true },
  { id: '2', name: 'Song 2', active: false },
];

function Test() {
  return (
    <div>
      <h3>Playlist Test</h3>
      <Playlist 
        items={items} 
        onReorder={() => {}} 
        onPlay={() => {}} 
        onDelete={() => {}} 
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Test />);
