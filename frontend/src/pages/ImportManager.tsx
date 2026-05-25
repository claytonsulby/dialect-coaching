import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ImportEntry, ImportJob } from "../types";

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inQuotes) {
      if (ch === '"' && row[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

type Source = "idea" | "speech_accent_archive" | "csv";

const SOURCE_LABELS: Record<Source, string> = {
  idea: "IDEA",
  speech_accent_archive: "Speech Accent Archive",
  csv: "CSV",
};

function StatusBadge({ status }: { status: ImportJob["status"] }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-600 text-gray-200",
    processing: "bg-yellow-600 text-yellow-100",
    completed: "bg-green-700 text-green-100",
    error: "bg-red-700 text-red-100",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-600 text-gray-200"}`}>
      {status}
    </span>
  );
}

export default function ImportManager() {
  const [source, setSource] = useState<Source>("idea");
  const [rawText, setRawText] = useState("");
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [parseError, setParseError] = useState("");
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  // Auto-refresh while any job is processing
  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === "processing" || j.status === "pending");
    if (hasProcessing && !intervalRef.current) {
      intervalRef.current = setInterval(loadJobs, 3000);
    } else if (!hasProcessing && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobs]);

  async function loadJobs() {
    try {
      const data = await api.imports.listJobs();
      setJobs(data);
    } catch {
      // ignore
    }
  }

  function handleParse() {
    setParseError("");
    setEntries([]);
    const text = rawText.trim();
    if (!text) {
      setParseError("Paste JSON entries or upload a file.");
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const arr: ImportEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
      if (!Array.isArray(arr) || arr.length === 0) {
        setParseError("Expected a JSON array of entry objects.");
        return;
      }
      setEntries(arr);
    } catch {
      setParseError("Invalid JSON. Please check the format.");
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setRawText(text);
      // Auto-parse after loading file
      setParseError("");
      setEntries([]);
      try {
        const parsed = JSON.parse(text);
        const arr: ImportEntry[] = Array.isArray(parsed) ? parsed : parsed.entries ?? [];
        if (!Array.isArray(arr) || arr.length === 0) {
          setParseError("Expected a JSON array of entry objects.");
          return;
        }
        setEntries(arr);
      } catch {
        // Try CSV: first line is headers, rest are data
        try {
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) {
            setParseError("CSV must have a header row and at least one data row.");
            return;
          }
          const headers = parseCsvRow(lines[0]);
          const csvEntries: ImportEntry[] = lines.slice(1).map((line) => {
            const values = parseCsvRow(line);
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] ?? "";
            });
            return {
              speaker_name: obj.speaker_name ?? "",
              audio_url: obj.audio_url ?? "",
              region_path: obj.region_path ?? "",
              external_id: obj.external_id ?? "",
              age_range: obj.age_range || null,
              gender: obj.gender || null,
              ethnicity: obj.ethnicity || null,
              socioeconomic_status: obj.socioeconomic_status || null,
              notes: obj.notes ?? "",
            };
          });
          setEntries(csvEntries);
          setRawText(JSON.stringify(csvEntries, null, 2));
        } catch {
          setParseError("Could not parse as JSON or CSV.");
        }
      }
    };
    reader.readAsText(file);
  }

  async function handleStartImport() {
    if (entries.length === 0) return;
    setSubmitting(true);
    try {
      const startFn =
        source === "idea"
          ? api.imports.startIdea
          : source === "speech_accent_archive"
            ? api.imports.startSpeechAccent
            : api.imports.startCsv;
      await startFn(entries);
      setEntries([]);
      setRawText("");
      await loadJobs();
    } catch (err: any) {
      setParseError(err.message ?? "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">External Corpus Import</h1>

      {/* Start Import Section */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <h2 className="text-lg font-semibold text-white">Start Import</h2>

        {/* Source selector */}
        <div className="flex gap-4">
          {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="radio"
                name="source"
                value={s}
                checked={source === s}
                onChange={() => setSource(s)}
                className="accent-blue-500"
              />
              {SOURCE_LABELS[s]}
            </label>
          ))}
        </div>

        {/* Textarea for JSON */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Paste JSON entries or upload a JSON/CSV file
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
            placeholder={`[\n  {\n    "speaker_name": "John Doe",\n    "audio_url": "https://example.com/audio.mp3",\n    "region_path": "us/pa",\n    "external_id": "speaker-001"\n  }\n]`}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* File upload and parse button */}
        <div className="flex items-center gap-3">
          <label className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition cursor-pointer text-gray-200">
            Upload File
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleParse}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition text-gray-200"
          >
            Parse JSON
          </button>
        </div>

        {parseError && (
          <p className="text-sm text-red-400">{parseError}</p>
        )}

        {/* Preview table */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              {entries.length} {entries.length === 1 ? "entry" : "entries"} parsed
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Speaker</th>
                    <th className="py-2 pr-3">Audio URL</th>
                    <th className="py-2 pr-3">Region</th>
                    <th className="py-2 pr-3">External ID</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 20).map((entry, i) => (
                    <tr key={i} className="border-b border-gray-800 text-gray-300">
                      <td className="py-1.5 pr-3 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 pr-3">{entry.speaker_name || "-"}</td>
                      <td className="py-1.5 pr-3 max-w-xs truncate">{entry.audio_url || "-"}</td>
                      <td className="py-1.5 pr-3">{entry.region_path || "-"}</td>
                      <td className="py-1.5 pr-3">{entry.external_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {entries.length > 20 && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing first 20 of {entries.length} entries
                </p>
              )}
            </div>
            <button
              onClick={handleStartImport}
              disabled={submitting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm font-medium transition text-white"
            >
              {submitting ? "Starting..." : "Start Import"}
            </button>
          </div>
        )}
      </div>

      {/* Import History Section */}
      <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Import History</h2>
          <button
            onClick={loadJobs}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition text-gray-200"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No import jobs yet.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Progress</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-800 text-gray-300">
                  <td className="py-2 pr-3 text-gray-500">{job.id}</td>
                  <td className="py-2 pr-3">
                    {SOURCE_LABELS[job.source as Source] ?? job.source}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-2 pr-3">
                    {job.processed_entries}/{job.total_entries}
                  </td>
                  <td className="py-2 pr-3 text-gray-500">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">
                    {job.error_message ? (
                      <button
                        onClick={() =>
                          setExpandedError(expandedError === job.id ? null : job.id)
                        }
                        className="text-red-400 hover:text-red-300 text-xs underline"
                      >
                        {expandedError === job.id ? "hide" : "show"}
                      </button>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Expanded error message */}
        {expandedError !== null && (
          <div className="p-3 bg-gray-800 border border-red-900 rounded text-xs text-red-300 font-mono whitespace-pre-wrap">
            {jobs.find((j) => j.id === expandedError)?.error_message}
          </div>
        )}
      </div>
    </div>
  );
}
