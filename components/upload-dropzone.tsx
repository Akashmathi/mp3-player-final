import React from "react";
import { Button } from "./ui/button";

export function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  function onPick() {
    inputRef.current?.click();
  }

  function handleFiles(flist: FileList | null) {
    if (!flist) return;
    const files = Array.from(flist).filter((f) => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith(".mp3"));
    if (files.length) onFiles(files);
  }

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${dragOver ? "bg-accent" : "bg-card"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p>Upload MP3 files by dragging here, or pick from your device.</p>
        </div>
        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,.mp3"
            className="hidden"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={onPick}>Choose files</Button>
        </div>
      </div>
    </div>
  );
}
