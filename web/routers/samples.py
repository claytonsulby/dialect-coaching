from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import SpeakerSample, Tag, sample_tag
from web.schemas import SampleCreate, SampleResponse, SampleUpdate

router = APIRouter(prefix="/api/samples", tags=["samples"])


def _resolve_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    tags = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        tag = db.query(Tag).filter(Tag.name == name).first()
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


def _sample_to_response(sample: SpeakerSample) -> dict:
    return {
        "id": sample.id,
        "speaker_id": sample.speaker_id,
        "speaker_name": sample.speaker.name if sample.speaker else "",
        "accent_profile_id": sample.accent_profile_id,
        "accent_profile_name": sample.accent_profile.name if sample.accent_profile else None,
        "audio_resource_id": sample.audio_resource_id,
        "quality_rating": sample.quality_rating,
        "accent_strength": sample.accent_strength,
        "is_curated": bool(sample.is_curated),
        "tags": [t.name for t in sample.tags],
        "notes": sample.notes,
        "created_at": sample.created_at,
    }


@router.get("", response_model=list[SampleResponse])
def list_samples(
    speaker_id: int | None = None,
    accent_profile_id: int | None = None,
    min_strength: float | None = None,
    max_strength: float | None = None,
    is_curated: bool | None = None,
    tag: str | None = None,
    min_rating: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(SpeakerSample)
    if speaker_id is not None:
        q = q.filter(SpeakerSample.speaker_id == speaker_id)
    if accent_profile_id is not None:
        q = q.filter(SpeakerSample.accent_profile_id == accent_profile_id)
    if min_strength is not None:
        q = q.filter(SpeakerSample.accent_strength >= min_strength)
    if max_strength is not None:
        q = q.filter(SpeakerSample.accent_strength <= max_strength)
    if is_curated is not None:
        q = q.filter(SpeakerSample.is_curated == (1 if is_curated else 0))
    if tag is not None:
        q = q.join(sample_tag).join(Tag).filter(Tag.name == tag.strip().lower())
    if min_rating is not None:
        q = q.filter(SpeakerSample.quality_rating >= min_rating)
    samples = q.order_by(SpeakerSample.created_at.desc()).all()
    return [_sample_to_response(s) for s in samples]


@router.post("", response_model=SampleResponse, status_code=201)
def create_sample(data: SampleCreate, db: Session = Depends(get_db)):
    sample = SpeakerSample(
        speaker_id=data.speaker_id,
        audio_resource_id=data.audio_resource_id,
        accent_profile_id=data.accent_profile_id,
        quality_rating=data.quality_rating,
        notes=data.notes,
    )
    if data.tags:
        sample.tags = _resolve_tags(db, data.tags)
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return _sample_to_response(sample)


@router.get("/{sample_id}", response_model=SampleResponse)
def get_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = db.get(SpeakerSample, sample_id)
    if not sample:
        raise HTTPException(404, "Sample not found")
    return _sample_to_response(sample)


@router.put("/{sample_id}", response_model=SampleResponse)
def update_sample(sample_id: int, data: SampleUpdate, db: Session = Depends(get_db)):
    sample = db.get(SpeakerSample, sample_id)
    if not sample:
        raise HTTPException(404, "Sample not found")
    if data.accent_profile_id is not None:
        sample.accent_profile_id = data.accent_profile_id
    if data.quality_rating is not None:
        sample.quality_rating = data.quality_rating
    if data.is_curated is not None:
        sample.is_curated = 1 if data.is_curated else 0
    if data.tags is not None:
        sample.tags = _resolve_tags(db, data.tags)
    if data.notes is not None:
        sample.notes = data.notes
    db.commit()
    db.refresh(sample)
    return _sample_to_response(sample)


@router.delete("/{sample_id}", status_code=204)
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = db.get(SpeakerSample, sample_id)
    if not sample:
        raise HTTPException(404, "Sample not found")
    db.delete(sample)
    db.commit()
