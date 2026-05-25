import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import type { Segment } from "../types";

export interface WaveformHandle {
  playSegment: (segId: number) => void;
  playRange: (start: number, end: number) => void;
}

interface Props {
  audioUrl: string;
  segments: Segment[];
  activeSegmentId: number | null;
  selectedSegmentIds: Set<number>;
  onRegionCreated?: (start: number, end: number) => void;
  onReady?: (duration: number) => void;
}

const Waveform = forwardRef<WaveformHandle, Props>(function Waveform(
  { audioUrl, segments, activeSegmentId, selectedSegmentIds, onRegionCreated, onReady },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create();
    regionsRef.current = regions;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4a5568",
      progressColor: "#3b82f6",
      cursorColor: "#f59e0b",
      height: 100,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      plugins: [regions],
    });

    ws.load(audioUrl);
    ws.on("ready", () => onReady?.(ws.getDuration()));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("timeupdate", (t) => setCurrentTime(t));
    ws.on("finish", () => setPlaying(false));

    regions.enableDragSelection({ color: "rgba(59, 130, 246, 0.2)" });
    regions.on("region-created", (region: any) => {
      onRegionCreated?.(region.start, region.end);
    });

    wsRef.current = ws;
    return () => ws.destroy();
  }, [audioUrl]);

  useEffect(() => {
    if (!regionsRef.current || !wsRef.current) return;
    regionsRef.current.clearRegions();
    for (const seg of segments) {
      const isSelected = selectedSegmentIds.has(seg.id);
      const isActive = seg.id === activeSegmentId;
      regionsRef.current.addRegion({
        start: seg.start_time,
        end: seg.end_time,
        color: isActive
          ? "rgba(245, 158, 11, 0.25)"
          : isSelected
            ? "rgba(59, 130, 246, 0.2)"
            : "rgba(107, 114, 128, 0.1)",
        drag: false,
        resize: false,
      });
    }
  }, [segments, activeSegmentId, selectedSegmentIds]);

  const playRange = useCallback((start: number, end: number) => {
    if (!wsRef.current) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    const dur = wsRef.current.getDuration();
    if (dur <= 0) return;
    wsRef.current.seekTo(Math.min(start / dur, 1));
    wsRef.current.play();
    stopTimerRef.current = setTimeout(() => wsRef.current?.pause(), (end - start) * 1000);
  }, []);

  const playSegment = useCallback(
    (segId: number) => {
      const seg = segments.find((s) => s.id === segId);
      if (!seg) return;
      playRange(seg.start_time, seg.end_time);
    },
    [segments, playRange]
  );

  useImperativeHandle(ref, () => ({ playSegment, playRange }), [playSegment, playRange]);

  const togglePlay = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    wsRef.current?.playPause();
  }, []);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="rounded-lg bg-gray-900 p-2" />
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={togglePlay}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="text-gray-400">{currentTime.toFixed(1)}s</span>
      </div>
    </div>
  );
});

export default Waveform;
