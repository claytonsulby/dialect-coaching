import { useCallback, useRef, useState } from "react";
import { api } from "../api/client";

interface Props {
  projectId: number;
  actorId?: number;
  onUploaded: () => void;
}

export default function AudioUpload({ projectId, actorId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await api.audio.upload(projectId, file, actorId);
        }
        onUploaded();
      } catch (e: any) {
        alert(`Upload failed: ${e.message}`);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [projectId, actorId, onUploaded]
  );

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm font-medium transition"
      >
        {uploading ? "Uploading..." : "Upload Audio"}
      </button>
    </div>
  );
}
