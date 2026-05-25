import { Link } from "react-router-dom";
import type { SpeakerSample } from "../types";

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
    <Link
      to={`/audio/${sample.audio_resource_id}`}
      className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-white truncate">{sample.speaker_name || `Speaker #${sample.speaker_id}`}</div>
        {sample.is_curated && (
          <span className="shrink-0 text-xs bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded">
            Curated
          </span>
        )}
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

      {sample.notes && (
        <div className="text-xs text-gray-500 mt-2 line-clamp-2">{sample.notes}</div>
      )}
    </Link>
  );
}
