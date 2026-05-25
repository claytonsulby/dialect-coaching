from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Speaker
from web.schemas import SpeakerCreate, SpeakerResponse, SpeakerUpdate

router = APIRouter(prefix="/api/speakers", tags=["speakers"])


@router.get("", response_model=list[SpeakerResponse])
def list_speakers(
    region_id: int | None = None,
    gender: str | None = None,
    age_range: str | None = None,
    source: str | None = None,
    q: str | None = Query(None, alias="q"),
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Speaker)
    if region_id:
        query = query.filter(Speaker.origin_region_id == region_id)
    if gender:
        query = query.filter(Speaker.gender == gender)
    if age_range:
        query = query.filter(Speaker.age_range == age_range)
    if source:
        query = query.filter(Speaker.source == source)
    term = q or search
    if term:
        query = query.filter(Speaker.name.ilike(f"%{term}%"))
    return query.order_by(Speaker.name).all()


@router.post("", response_model=SpeakerResponse, status_code=201)
def create_speaker(data: SpeakerCreate, db: Session = Depends(get_db)):
    speaker = Speaker(**data.model_dump())
    db.add(speaker)
    db.commit()
    db.refresh(speaker)
    return speaker


@router.get("/{speaker_id}", response_model=SpeakerResponse)
def get_speaker(speaker_id: int, db: Session = Depends(get_db)):
    speaker = db.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(404, "Speaker not found")
    return speaker


@router.put("/{speaker_id}", response_model=SpeakerResponse)
def update_speaker(speaker_id: int, data: SpeakerUpdate, db: Session = Depends(get_db)):
    speaker = db.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(404, "Speaker not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(speaker, field, value)
    db.commit()
    db.refresh(speaker)
    return speaker


@router.delete("/{speaker_id}", status_code=204)
def delete_speaker(speaker_id: int, db: Session = Depends(get_db)):
    speaker = db.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(404, "Speaker not found")
    db.delete(speaker)
    db.commit()
