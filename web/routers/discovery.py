from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import AccentProfile, Speaker, SpeakerSample
from web.services.search import (
    get_discovery_stats,
    search_profiles,
    search_samples,
    search_speakers,
)

router = APIRouter(prefix="/api/discovery", tags=["discovery"])


def _speaker_to_dict(s: Speaker) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "origin_region_id": s.origin_region_id,
        "origin_region_name": s.origin_region.name if s.origin_region else None,
        "age_range": s.age_range,
        "gender": s.gender,
        "ethnicity": s.ethnicity,
        "socioeconomic_status": s.socioeconomic_status,
        "source": s.source,
        "created_at": s.created_at.isoformat(),
    }


def _sample_to_dict(s: SpeakerSample) -> dict:
    return {
        "id": s.id,
        "speaker_id": s.speaker_id,
        "speaker_name": s.speaker.name if s.speaker else "",
        "accent_profile_id": s.accent_profile_id,
        "accent_profile_name": s.accent_profile.name if s.accent_profile else None,
        "audio_resource_id": s.audio_resource_id,
        "quality_rating": s.quality_rating,
        "accent_strength": s.accent_strength,
        "is_curated": bool(s.is_curated),
        "tags": [t.name for t in s.tags],
        "created_at": s.created_at.isoformat(),
    }


def _profile_to_dict(p: AccentProfile) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "region_id": p.region_id,
        "region_name": p.region.name if p.region else None,
        "source": p.source,
        "sample_count": p.sample_count,
        "pattern_count": len(p.patterns) if p.patterns else 0,
        "created_at": p.created_at.isoformat(),
    }


@router.get("/search")
def discovery_search(
    q: str | None = None,
    region_id: int | None = None,
    gender: str | None = None,
    age_range: str | None = None,
    min_strength: float | None = None,
    max_strength: float | None = None,
    accent_profile_id: int | None = None,
    tag: str | None = None,
    source: str | None = None,
    is_curated: bool | None = None,
    project_id: int | None = None,
    actor_id: int | None = None,
    entity_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    filters = {k: v for k, v in locals().items() if k != "db" and v is not None}
    result: dict = {"speakers": [], "samples": [], "profiles": [], "total_count": 0}

    if not entity_type or entity_type == "speaker":
        speakers = search_speakers(db, **filters)
        result["speakers"] = [_speaker_to_dict(s) for s in speakers]

    if not entity_type or entity_type == "sample":
        samples = search_samples(db, **filters)
        result["samples"] = [_sample_to_dict(s) for s in samples]

    if not entity_type or entity_type == "profile":
        profiles = search_profiles(db, **filters)
        result["profiles"] = [_profile_to_dict(p) for p in profiles]

    result["total_count"] = len(result["speakers"]) + len(result["samples"]) + len(result["profiles"])
    return result


@router.get("/stats")
def discovery_stats(db: Session = Depends(get_db)):
    return get_discovery_stats(db)
