"""Forvo corpus lookup router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import AppSetting
from web.schemas import ForvoLookupRequest, ForvoLookupResponse, ForvoStatusResponse

router = APIRouter(prefix="/api/corpus/forvo", tags=["forvo"])


@router.get("/status", response_model=ForvoStatusResponse)
def forvo_status(db: Session = Depends(get_db)):
    setting = db.query(AppSetting).filter(AppSetting.key == "forvo_api_key").first()
    configured = bool(setting and setting.value)
    return ForvoStatusResponse(configured=configured)


@router.post("/lookup", response_model=ForvoLookupResponse)
def forvo_lookup(req: ForvoLookupRequest, db: Session = Depends(get_db)):
    from web.services.forvo import lookup_word

    try:
        samples = lookup_word(db, req.word, req.language)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return ForvoLookupResponse(samples=samples, count=len(samples))
