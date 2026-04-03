import { useState, useRef, useCallback } from "react";

interface Props {
  file: File | null;
  uploading: boolean;
  onDrop: (file: File) => void;
}

export function VideoDropzone({ file, uploading, onDrop }: Props) {
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragover(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("video/")) {
        onDrop(f);
      }
    },
    [onDrop]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onDrop(f);
    },
    [onDrop]
  );

  if (file) {
    return (
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-gray-500">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        {uploading && (
          <div className="text-sm text-yellow-400 animate-pulse">Uploading...</div>
        )}
        {!uploading && (
          <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div
      className={`dropzone ${dragover ? "dragover" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-gray-400 text-sm mb-1">
        Drop your video here or <span className="text-brand-500">browse</span>
      </p>
      <p className="text-gray-600 text-xs">MP4, MOV, WebM — up to 500MB</p>
    </div>
  );
}
