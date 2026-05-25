from sqlalchemy import func
from sqlalchemy.orm import Session

from web.models import AccentProfile, Region, Speaker, SpeakerSample, Tag, sample_tag


def search_speakers(db: Session, **filters) -> list[Speaker]:
    q = db.query(Speaker)
    if filters.get("q"):
        q = q.filter(Speaker.name.ilike(f"%{filters['q']}%"))
    if filters.get("region_id"):
        region = db.get(Region, filters["region_id"])
        if region:
            q = q.join(Region, Speaker.origin_region_id == Region.id)
            q = q.filter(Region.path.like(f"{region.path}%"))
    if filters.get("gender"):
        q = q.filter(Speaker.gender == filters["gender"])
    if filters.get("age_range"):
        q = q.filter(Speaker.age_range == filters["age_range"])
    if filters.get("source"):
        q = q.filter(Speaker.source == filters["source"])
    limit = filters.get("limit", 50)
    offset = filters.get("offset", 0)
    return q.order_by(Speaker.name).offset(offset).limit(limit).all()


def search_samples(db: Session, **filters) -> list[SpeakerSample]:
    q = db.query(SpeakerSample)
    if filters.get("accent_profile_id"):
        q = q.filter(SpeakerSample.accent_profile_id == filters["accent_profile_id"])
    if "min_strength" in filters and filters["min_strength"] is not None:
        q = q.filter(SpeakerSample.accent_strength >= float(filters["min_strength"]))
    if "max_strength" in filters and filters["max_strength"] is not None:
        q = q.filter(SpeakerSample.accent_strength <= float(filters["max_strength"]))
    if filters.get("tag"):
        q = q.join(sample_tag).join(Tag).filter(Tag.name == filters["tag"])
    if "is_curated" in filters and filters["is_curated"] is not None:
        q = q.filter(SpeakerSample.is_curated == 1)
    # Join Speaker at most once for region_id and/or gender filters
    needs_speaker_join = filters.get("region_id") or filters.get("gender")
    if needs_speaker_join:
        q = q.join(Speaker, SpeakerSample.speaker_id == Speaker.id)
    if filters.get("region_id"):
        region = db.get(Region, filters["region_id"])
        if region:
            q = q.join(Region, Speaker.origin_region_id == Region.id)
            q = q.filter(Region.path.like(f"{region.path}%"))
    if filters.get("gender"):
        q = q.filter(Speaker.gender == filters["gender"])
    limit = filters.get("limit", 50)
    offset = filters.get("offset", 0)
    return q.offset(offset).limit(limit).all()


def search_profiles(db: Session, **filters) -> list[AccentProfile]:
    q = db.query(AccentProfile)
    if filters.get("q"):
        q = q.filter(AccentProfile.name.ilike(f"%{filters['q']}%"))
    if filters.get("region_id"):
        region = db.get(Region, filters["region_id"])
        if region:
            q = q.join(Region, AccentProfile.region_id == Region.id)
            q = q.filter(Region.path.like(f"{region.path}%"))
    limit = filters.get("limit", 50)
    offset = filters.get("offset", 0)
    return q.order_by(AccentProfile.name).offset(offset).limit(limit).all()


def get_discovery_stats(db: Session) -> dict:
    return {
        "total_speakers": db.query(func.count(Speaker.id)).scalar() or 0,
        "total_samples": db.query(func.count(SpeakerSample.id)).scalar() or 0,
        "total_profiles": db.query(func.count(AccentProfile.id)).scalar() or 0,
        "total_regions": db.query(func.count(Region.id)).scalar() or 0,
    }
