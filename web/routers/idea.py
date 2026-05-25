"""Router for IDEA (International Dialects of English Archive) corpus integration."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob
from web.schemas import IdeaSyncResponse, ImportJobResponse
from web.services.idea import SOURCE, start_sync

router = APIRouter(prefix="/api/corpus/idea", tags=["corpus"])


@router.post("/sync", response_model=IdeaSyncResponse)
def trigger_sync(db: Session = Depends(get_db)):
    """Trigger a full sync of the IDEA corpus. Returns an ImportJob."""
    job = ImportJob(source=SOURCE, status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)
    start_sync(job.id)
    return job


@router.get("/status", response_model=ImportJobResponse | None)
def get_status(db: Session = Depends(get_db)):
    """Return the latest import job status for IDEA corpus."""
    job = (
        db.query(ImportJob)
        .filter(ImportJob.source == SOURCE)
        .order_by(ImportJob.created_at.desc())
        .first()
    )
    if not job:
        return None
    return job
