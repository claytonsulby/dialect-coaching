"""Router for Speech Accent Archive corpus integration."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob
from web.schemas import ImportJobResponse, SpeechAccentArchiveSyncResponse
from web.services.speech_accent_archive import SOURCE, start_sync

router = APIRouter(prefix="/api/corpus/speech-accent-archive", tags=["corpus"])


@router.post("/sync", response_model=SpeechAccentArchiveSyncResponse)
def trigger_sync(db: Session = Depends(get_db)):
    """Trigger a full sync of the Speech Accent Archive. Returns an ImportJob."""
    job = ImportJob(source=SOURCE, status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)
    start_sync(job.id)
    return job


@router.get("/status", response_model=ImportJobResponse | None)
def get_status(db: Session = Depends(get_db)):
    """Return the latest import job status for Speech Accent Archive."""
    job = (
        db.query(ImportJob)
        .filter(ImportJob.source == SOURCE)
        .order_by(ImportJob.created_at.desc())
        .first()
    )
    if not job:
        return None
    return job
