import { Link } from "react-router-dom";
import type { SpeakerSample } from "../types";
import SourceBadge from "./SourceBadge";
import AudioLink from "./AudioLink";

interface SampleCardProps {
  sample: SpeakerSample;
}

function StarRating({ rating }: { rating: number | null }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= (rating ?? 0) ? "text-yellow-400" : "text-gray-600"}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function SampleCard({ sample }: SampleCardProps) {
  const strengthPercent =
    sample.accent_strength != null
      ? `${Math.round(sample.accent_strength * 100)}%`
      : null;

  return (
    <div className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/audio/${sample.audio_resource_id}`}
          className="font-medium text-white truncate hover:text-blue-300 transition"
        >
          {sample.speaker_name || `Speaker #${sample.speaker_id}`}
        </Link>
        <div className="flex gap-1 shrink-0">
          {(sample as any).source && <SourceBadge source={(sample as any).source} />}
          {sample.is_curated && (
            <span className="text-xs bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded">
              Curated
            </span>
          )}
        </div>
      </div>

      {sample.accent_profile_name && (
        <div className="text-sm text-gray-400 mt-1 truncate">{sample.accent_profile_name}</div>
      )}

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <StarRating rating={sample.quality_rating} />
        {strengthPercent && (
          <span>Strength: {strengthPercent}</span>
        )}
      </div>

      {sample.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sample.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        {sample.notes && (
          <div className="text-xs text-gray-500 line-clamp-2 flex-1">{sample.notes}</div>
        )}
        <AudioLink audioResourceId={sample.audio_resource_id} />
      </div>
    </div>
  );
}
