const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  common_voice: { bg: "bg-green-600/20", text: "text-green-400", label: "Common Voice" },
  speech_accent_archive: { bg: "bg-orange-600/20", text: "text-orange-400", label: "SAA" },
  phoible: { bg: "bg-blue-600/20", text: "text-blue-400", label: "PHOIBLE" },
  forvo: { bg: "bg-purple-600/20", text: "text-purple-400", label: "Forvo" },
  bundled: { bg: "bg-gray-600/20", text: "text-gray-400", label: "Bundled" },
  manual: { bg: "bg-gray-700/30", text: "text-gray-300", label: "Manual" },
  local: { bg: "bg-gray-700/30", text: "text-gray-300", label: "Local" },
  idea: { bg: "bg-yellow-600/20", text: "text-yellow-400", label: "IDEA" },
  csv: { bg: "bg-yellow-600/20", text: "text-yellow-400", label: "CSV" },
};

interface SourceBadgeProps {
  source: string;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const style = SOURCE_STYLES[source] ?? { bg: "bg-gray-700/30", text: "text-gray-300", label: source };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
