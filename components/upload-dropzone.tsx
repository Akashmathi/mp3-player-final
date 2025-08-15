import React from "react";

export function UploadDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function handleFiles(flist: FileList | null) {
    if (!flist) return;
    const files = Array.from(flist).filter((f) => f.type === "audio/mpeg" || f.name.toLowerCase().endsWith(".mp3"));
    if (files.length) onFiles(files);
  }

  return (
    <div className="card upload-dropzone">
      <p>Upload MP3 files by dragging here, or pick from your device.</p>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,.mp3"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button className="btn" onClick={() => inputRef.current?.click()}>
        Choose files
      </button>
    </div>
  );
}