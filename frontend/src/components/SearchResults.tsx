import { Link } from "react-router-dom";
import type { DiscoveryResult, Speaker, SpeakerSample, AccentProfileSummary } from "../types";
import SourceBadge from "./SourceBadge";

interface Props {
  results: DiscoveryResult;
  activeTab: string;
}

function SpeakerCard({ speaker }: { speaker: Speaker }) {
  return (
    <Link
      to={`/speakers/${speaker.id}`}
      className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-white">{speaker.name}</div>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
            {speaker.origin_region_name && (
              <span>{speaker.origin_region_name}</span>
            )}
            {speaker.gender && <span>{speaker.gender}</span>}
            {speaker.age_range && <span>{speaker.age_range}</span>}
          </div>
        </div>
        <SourceBadge source={speaker.source} />
      </div>
    </Link>
  );
}

function SampleCard({ sample }: { sample: SpeakerSample }) {
  return (
    <Link
      to={`/audio/${sample.audio_resource_id}`}
      className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{sample.speaker_name}</div>
          {sample.accent_profile_name && (
            <div className="text-sm text-gray-400 mt-0.5">
              {sample.accent_profile_name}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            {sample.accent_strength != null && (
              <span>Strength: {Math.round(sample.accent_strength)}%</span>
            )}
            {sample.quality_rating != null && (
              <span>
                {"*".repeat(sample.quality_rating)}
                {"*".repeat(Math.max(0, 5 - sample.quality_rating)).replace(/\*/g, "")}
                {" "}({sample.quality_rating}/5)
              </span>
            )}
          </div>
          {sample.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {sample.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {sample.is_curated && (
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-400">
            Curated
          </span>
        )}
      </div>
    </Link>
  );
}

function ProfileCard({ profile }: { profile: AccentProfileSummary }) {
  return (
    <Link
      to={`/profiles/${profile.id}`}
      className="block p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{profile.name}</div>
          {profile.description && (
            <div className="text-sm text-gray-400 mt-0.5 line-clamp-2">
              {profile.description}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
            {profile.region_name && <span>{profile.region_name}</span>}
            <span>{profile.pattern_count} pattern{profile.pattern_count !== 1 ? "s" : ""}</span>
            <span>{profile.sample_count} sample{profile.sample_count !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <SourceBadge source={profile.source} />
        </div>
      </div>
    </Link>
  );
}

export default function SearchResults({ results, activeTab }: Props) {
  const showSpeakers = activeTab === "all" || activeTab === "speaker";
  const showSamples = activeTab === "all" || activeTab === "sample";
  const showProfiles = activeTab === "all" || activeTab === "profile";

  const hasSpeakers = results.speakers.length > 0;
  const hasSamples = results.samples.length > 0;
  const hasProfiles = results.profiles.length > 0;
  const hasAny = hasSpeakers || hasSamples || hasProfiles;

  if (!hasAny) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No results found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSpeakers && hasSpeakers && (
        <div>
          {activeTab === "all" && (
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Speakers ({results.speakers.length})
            </h3>
          )}
          <div className="grid gap-3">
            {results.speakers.map((s) => (
              <SpeakerCard key={s.id} speaker={s} />
            ))}
          </div>
        </div>
      )}

      {showSamples && hasSamples && (
        <div>
          {activeTab === "all" && (
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Samples ({results.samples.length})
            </h3>
          )}
          <div className="grid gap-3">
            {results.samples.map((s) => (
              <SampleCard key={s.id} sample={s} />
            ))}
          </div>
        </div>
      )}

      {showProfiles && hasProfiles && (
        <div>
          {activeTab === "all" && (
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Accent Profiles ({results.profiles.length})
            </h3>
          )}
          <div className="grid gap-3">
            {results.profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
