from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob, Speaker, SpeakerSample
from web.schemas import ImportJobResponse, ImportRequest, SourceStatus
from web.services.corpus_import import start_import

router = APIRouter(prefix="/api/imports", tags=["imports"])

KNOWN_SOURCES = [
    {"name": "IDEA", "source_key": "idea", "description": "International Dialects of English Archive"},
    {"name": "Speech Accent Archive", "source_key": "speech_accent_archive", "description": "George Mason University accent corpus"},
    {"name": "Common Voice", "source_key": "common_voice", "description": "Mozilla crowdsourced voice dataset"},
    {"name": "Forvo", "source_key": "forvo", "description": "Word pronunciation database"},
    {"name": "CSV Import", "source_key": "csv", "description": "Custom CSV/JSON imports"},
]


@router.get("/sources", response_model=list[SourceStatus])
def list_sources(db: Session = Depends(get_db)):
    results = []
    for src in KNOWN_SOURCES:
        key = src["source_key"]
        speaker_count = db.query(func.count(Speaker.id)).filter(Speaker.source == key).scalar() or 0
        sample_count = (
            db.query(func.count(SpeakerSample.id))
            .join(Speaker, SpeakerSample.speaker_id == Speaker.id)
            .filter(Speaker.source == key)
            .scalar() or 0
        )
        latest_job = (
            db.query(ImportJob)
            .filter(ImportJob.source == key)
            .order_by(ImportJob.created_at.desc())
            .first()
        )
        results.append(SourceStatus(
            name=src["name"],
            source_key=key,
            description=src["description"],
            speaker_count=speaker_count,
            sample_count=sample_count,
            last_sync_at=latest_job.created_at if latest_job else None,
            last_status=latest_job.status if latest_job else None,
        ))
    return results


@router.post("/idea", status_code=201)
def import_idea(data: ImportRequest, db: Session = Depends(get_db)):
    job = ImportJob(source="idea", total_entries=len(data.entries))
    db.add(job)
    db.commit()
    db.refresh(job)
    entries_dicts = [e.model_dump() for e in data.entries]
    start_import(job.id, entries_dicts, "idea")
    return {"job_id": job.id, "status": "pending"}


@router.post("/speech-accent-archive", status_code=201)
def import_speech_accent_archive(data: ImportRequest, db: Session = Depends(get_db)):
    job = ImportJob(source="speech_accent_archive", total_entries=len(data.entries))
    db.add(job)
    db.commit()
    db.refresh(job)
    entries_dicts = [e.model_dump() for e in data.entries]
    start_import(job.id, entries_dicts, "speech_accent_archive")
    return {"job_id": job.id, "status": "pending"}


@router.post("/csv", status_code=201)
def import_csv(data: ImportRequest, db: Session = Depends(get_db)):
    job = ImportJob(source="csv", total_entries=len(data.entries))
    db.add(job)
    db.commit()
    db.refresh(job)
    entries_dicts = [e.model_dump() for e in data.entries]
    start_import(job.id, entries_dicts, "csv")
    return {"job_id": job.id, "status": "pending"}


@router.get("/jobs", response_model=list[ImportJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(ImportJob).order_by(ImportJob.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=ImportJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ImportJob, job_id)
    if not job:
        raise HTTPException(404, "Import job not found")
    return job
