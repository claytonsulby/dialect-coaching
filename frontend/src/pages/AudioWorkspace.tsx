import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import Waveform, { type WaveformHandle } from "../components/Waveform";
import TranscriptView from "../components/TranscriptView";
import SelectionPanel from "../components/SelectionPanel";
import type { AudioDetail, Segment } from "../types";

export default function AudioWorkspace() {
  const { id } = useParams<{ id: string }>();
  const audioId = Number(id);

  const [audio, setAudio] = useState<AudioDetail | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());
  const [freeformRanges, setFreeformRanges] = useState<[number, number][]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const waveformRef = useRef<WaveformHandle>(null);

  const load = useCallback(async () => {
    const data = await api.audio.get(audioId);
    setAudio(data);
    if (data.status === "ready" && data.segments) {
      setSegments(data.segments);
    }
  }, [audioId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (audio?.status === "processing" || audio?.status === "pending") {
      pollRef.current = setInterval(load, 3000);
      return () => clearInterval(pollRef.current);
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [audio?.status, load]);

  const handleSegmentClick = useCallback((segId: number, ctrlKey: boolean) => {
    setActiveSegmentId(segId);
    setSelectedSegmentIds((prev) => {
      const next = new Set(prev);
      if (ctrlKey) {
        if (next.has(segId)) next.delete(segId);
        else next.add(segId);
      } else {
        next.clear();
        next.add(segId);
      }
      return next;
    });
  }, []);

  const handleSegmentPlay = useCallback((segId: number) => {
    setActiveSegmentId(segId);
    waveformRef.current?.playSegment(segId);
  }, []);

  const handleRegionCreated = useCallback((start: number, end: number) => {
    setFreeformRanges((prev) => [...prev, [start, end]]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSegmentIds(new Set());
    setFreeformRanges([]);
    setActiveSegmentId(null);
  }, []);

  const handlePlaySelection = useCallback(() => {
    const selected = segments.filter((s) => selectedSegmentIds.has(s.id));
    if (selected.length > 0) {
      const first = selected[0];
      const last = selected[selected.length - 1];
      waveformRef.current?.playRange(first.start_time, last.end_time);
    } else if (freeformRanges.length > 0) {
      const [start, end] = freeformRanges[0];
      waveformRef.current?.playRange(start, end);
    }
  }, [segments, selectedSegmentIds, freeformRanges]);

  if (!audio) return <p className="text-gray-500">Loading...</p>;

  const isReady = audio.status === "ready";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projects/${audio.project_id}`} className="text-sm text-gray-500 hover:text-gray-300 transition">
            &larr; Back to project
          </Link>
          <h1 className="text-xl font-bold mt-1">{audio.original_filename}</h1>
          <div className="flex gap-3 text-sm text-gray-500 mt-1">
            {audio.duration && <span>{audio.duration.toFixed(1)}s</span>}
            <span
              className={
                audio.status === "ready"
                  ? "text-emerald-400"
                  : audio.status === "error"
                    ? "text-red-400"
                    : audio.status === "processing"
                      ? "text-amber-400"
                      : "text-gray-500"
              }
            >
              {audio.status}
            </span>
          </div>
        </div>
        {!isReady && audio.status !== "processing" && (
          <button
            onClick={async () => { await api.audio.transcribe(audioId); load(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition"
          >
            Transcribe
          </button>
        )}
      </div>

      {audio.error_message && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          {audio.error_message}
        </div>
      )}

      {audio.status === "processing" && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-sm animate-pulse">
          Transcription in progress... This may take a minute.
        </div>
      )}

      <Waveform
        ref={waveformRef}
        audioUrl={api.audio.fileUrl(audioId)}
        segments={segments}
        activeSegmentId={activeSegmentId}
        selectedSegmentIds={selectedSegmentIds}
        onRegionCreated={handleRegionCreated}
      />

      {isReady && (
        <>
          <TranscriptView
            segments={segments}
            activeSegmentId={activeSegmentId}
            selectedSegmentIds={selectedSegmentIds}
            onSegmentClick={handleSegmentClick}
            onSegmentPlay={handleSegmentPlay}
          />

          <SelectionPanel
            audioId={audioId}
            segments={segments}
            selectedSegmentIds={selectedSegmentIds}
            freeformRanges={freeformRanges}
            onClear={clearSelection}
            onPlaySelection={handlePlaySelection}
          />
        </>
      )}
    </div>
  );
}
