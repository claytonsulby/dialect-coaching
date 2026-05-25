import { useState } from "react";
import type { Segment } from "../types";
import { api, downloadBlob } from "../api/client";

interface Props {
  audioId: number;
  segments: Segment[];
  selectedSegmentIds: Set<number>;
  freeformRanges: [number, number][];
  onClear: () => void;
  onPlaySelection: () => void;
}

export default function SelectionPanel({
  audioId,
  segments,
  selectedSegmentIds,
  freeformRanges,
  onClear,
  onPlaySelection,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const selectedSegs = segments.filter((s) => selectedSegmentIds.has(s.id));
  const hasSelection = selectedSegs.length > 0 || freeformRanges.length > 0;

  if (!hasSelection) return null;

  const segIds = selectedSegs.map((s) => s.id);

  const handleExportAudio = async () => {
    setExporting(true);
    try {
      const blob = await api.audio.exportAudio(audioId, segIds, freeformRanges);
      downloadBlob(blob, "dialect_export.wav");
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportReport = async () => {
    setGeneratingReport(true);
    try {
      const data = await api.audio.exportReport(audioId, segIds, freeformRanges);
      if (data?.report?.text) {
        setReport(data.report.text);
      } else {
        setReport("(No accent differences found in selection.)");
      }
    } catch (e: any) {
      alert(`Report failed: ${e.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain" });
    downloadBlob(blob, "accent_report.txt");
  };

  const allChanges = selectedSegs.flatMap((s) =>
    s.words.flatMap((w) => w.phone_changes)
  );
  const changeCounts = new Map<string, number>();
  for (const c of allChanges) {
    const key = `${c.expected_phone}→${c.actual_phone}`;
    changeCounts.set(key, (changeCounts.get(key) || 0) + 1);
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          Selection ({selectedSegs.length} segment{selectedSegs.length !== 1 ? "s" : ""}
          {freeformRanges.length > 0 && `, ${freeformRanges.length} region${freeformRanges.length !== 1 ? "s" : ""}`})
        </h3>
        <div className="flex gap-3">
          <button
            onClick={onPlaySelection}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            Play Selection
          </button>
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-300 transition">
            Clear
          </button>
        </div>
      </div>

      {selectedSegs.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {selectedSegs.map((seg) => (
            <div key={seg.id} className="text-xs text-gray-400 truncate">
              {seg.text}
            </div>
          ))}
        </div>
      )}

      {changeCounts.size > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 font-medium">Accent patterns:</div>
          <div className="flex flex-wrap gap-1">
            {[...changeCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([change, count]) => (
                <span
                  key={change}
                  className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono"
                >
                  /{change}/ ({count}x)
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExportAudio}
          disabled={exporting}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm font-medium transition"
        >
          {exporting ? "Exporting..." : "Export Audio"}
        </button>
        <button
          onClick={handleExportReport}
          disabled={generatingReport}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded text-sm font-medium transition"
        >
          {generatingReport ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {report && (
        <div className="space-y-2">
          <pre className="text-xs text-gray-300 bg-gray-950 rounded p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
            {report}
          </pre>
          <button
            onClick={handleDownloadReport}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            Download as text file
          </button>
        </div>
      )}
    </div>
  );
}
