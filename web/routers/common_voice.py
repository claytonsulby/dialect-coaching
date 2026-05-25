from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob
from web.schemas import CommonVoiceImportRequest, CommonVoiceStatusResponse, ImportJobResponse
from web.services.common_voice import start_common_voice_import

router = APIRouter(prefix="/api/corpus/common-voice", tags=["common-voice"])


@router.post("/import", response_model=ImportJobResponse)
def import_common_voice(req: CommonVoiceImportRequest, db: Session = Depends(get_db)):
    job = ImportJob(source="common_voice", status="pending", total_entries=0)
    db.add(job)
    db.commit()
    db.refresh(job)

    start_common_voice_import(job.id, req.directory, req.locale, req.limit)
    return job


@router.get("/status", response_model=CommonVoiceStatusResponse)
def common_voice_status(db: Session = Depends(get_db)):
    job = (
        db.query(ImportJob)
        .filter(ImportJob.source == "common_voice")
        .order_by(ImportJob.created_at.desc())
        .first()
    )
    if not job:
        return CommonVoiceStatusResponse(active=False, job=None)
    return CommonVoiceStatusResponse(
        active=job.status in ("pending", "processing"),
        job=ImportJobResponse.model_validate(job),
    )
