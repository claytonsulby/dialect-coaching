from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob, Speaker, PhonemeInventory
from web.schemas import ImportJobResponse, ImportRequest
from web.services.corpus_import import start_import

router = APIRouter(prefix="/api/imports", tags=["imports"])


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


@router.get("/auto-sync-status")
def auto_sync_status(db: Session = Depends(get_db)):
    """Return the status of auto-synced corpora (SAA and PHOIBLE)."""
    saa_job = (
        db.query(ImportJob)
        .filter(ImportJob.source == "speech_accent_archive")
        .order_by(ImportJob.created_at.desc())
        .first()
    )
    phoible_job = (
        db.query(ImportJob)
        .filter(ImportJob.source == "phoible")
        .order_by(ImportJob.created_at.desc())
        .first()
    )
    speaker_count = db.query(Speaker).filter(Speaker.source == "speech_accent_archive").count()
    inventory_count = db.query(PhonemeInventory).count()

    def _job_info(job, count, count_label):
        if not job:
            return {"status": "not_started", count_label: 0}
        return {
            "status": job.status,
            "total_entries": job.total_entries,
            "processed_entries": job.processed_entries,
            "error_message": job.error_message,
            count_label: count,
        }

    return {
        "saa": _job_info(saa_job, speaker_count, "speakers"),
        "phoible": _job_info(phoible_job, inventory_count, "inventories"),
    }


@router.get("/jobs", response_model=list[ImportJobResponse])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(ImportJob).order_by(ImportJob.created_at.desc()).all()


@router.get("/jobs/{job_id}", response_model=ImportJobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ImportJob, job_id)
    if not job:
        raise HTTPException(404, "Import job not found")
    return job
