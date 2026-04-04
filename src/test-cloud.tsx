import React from 'react';
import { createRoot } from 'react-dom/client';
import { CloudSyncBar } from "./components/supabase-cloud";

function Test() {
  return (
    <div>
      <h3>Cloud Sync Bar Test</h3>
      <CloudSyncBar onImport={() => {}} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Test />);
