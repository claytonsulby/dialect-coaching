import type { Segment } from "../types";

interface Props {
  segments: Segment[];
  activeSegmentId: number | null;
  selectedSegmentIds: Set<number>;
  onSegmentClick: (segmentId: number, ctrlKey: boolean) => void;
  onSegmentPlay: (segmentId: number) => void;
}

export default function TranscriptView({
  segments,
  activeSegmentId,
  selectedSegmentIds,
  onSegmentClick,
  onSegmentPlay,
}: Props) {
  if (!segments.length) {
    return <p className="text-gray-500 italic">No transcript available.</p>;
  }

  return (
    <div className="space-y-1">
      {segments.map((seg) => {
        const isActive = seg.id === activeSegmentId;
        const isSelected = selectedSegmentIds.has(seg.id);
        const hasChanges = seg.words.some((w) => w.phone_changes.length > 0);

        return (
          <div
            key={seg.id}
            onClick={(e) => onSegmentClick(seg.id, e.metaKey || e.ctrlKey)}
            className={`p-3 rounded-lg cursor-pointer transition border group ${
              isActive
                ? "border-amber-500/50 bg-amber-500/10"
                : isSelected
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-transparent hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white">{seg.text}</div>
                <div className="text-sm text-blue-400 font-mono mt-1">
                  <span className="text-gray-500 text-xs mr-2">Standard</span>
                  /{seg.expected_phonemes}/
                </div>
                <div className="text-sm text-emerald-400 font-mono">
                  <span className="text-gray-500 text-xs mr-2">Heard</span>
                  /{seg.actual_phonemes}/
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSegmentPlay(seg.id);
                }}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white transition opacity-50 group-hover:opacity-100"
                title="Play segment"
              >
                <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
                  <path d="M0 0v14l12-7z" />
                </svg>
              </button>
            </div>
            {hasChanges && (
              <div className="mt-2 flex flex-wrap gap-2">
                {seg.words
                  .filter((w) => w.phone_changes.length > 0)
                  .map((w) => (
                    <span
                      key={w.id}
                      className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono"
                      title={w.phone_changes
                        .map((c) => `${c.expected_phone}→${c.actual_phone}`)
                        .join(", ")}
                    >
                      {w.word}: /{w.expected_phonemes}/ → /{w.actual_phonemes}/
                    </span>
                  ))}
              </div>
            )}
            <div className="text-xs text-gray-600 mt-1">
              {seg.start_time.toFixed(1)}s – {seg.end_time.toFixed(1)}s
            </div>
          </div>
        );
      })}
    </div>
  );
}
