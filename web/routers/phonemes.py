import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import ImportJob, PhonemeInventory
from web.schemas import ImportJobResponse, PhonemeInventoryResponse, PhoibleSyncResponse
from web.services.phoible import start_phoible_sync

router = APIRouter(prefix="/api/phonemes", tags=["phonemes"])


def _to_response(inv: PhonemeInventory) -> dict:
    return {
        "id": inv.id,
        "inventory_id": inv.inventory_id,
        "language_name": inv.language_name,
        "iso639_3": inv.iso639_3,
        "glottocode": inv.glottocode,
        "source_dataset": inv.source_dataset,
        "consonants": json.loads(inv.consonants_json or "[]"),
        "vowels": json.loads(inv.vowels_json or "[]"),
        "tones": json.loads(inv.tones_json or "[]"),
        "total_segments": inv.total_segments,
        "created_at": inv.created_at,
    }


@router.post("/sync", response_model=PhoibleSyncResponse)
def sync_phoible(db: Session = Depends(get_db)):
    job = ImportJob(source="phoible", status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)

    start_phoible_sync(job.id)

    return PhoibleSyncResponse(
        job=ImportJobResponse.model_validate(job),
        message="PHOIBLE sync started",
    )


@router.get("/inventories", response_model=list[PhonemeInventoryResponse])
def list_inventories(
    q: Optional[str] = Query(None),
    iso: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(PhonemeInventory)
    if q:
        query = query.filter(PhonemeInventory.language_name.ilike(f"%{q}%"))
    if iso:
        query = query.filter(PhonemeInventory.iso639_3 == iso)
    inventories = query.offset(skip).limit(limit).all()
    return [_to_response(inv) for inv in inventories]


@router.get("/inventories/{inventory_id}", response_model=PhonemeInventoryResponse)
def get_inventory(inventory_id: int, db: Session = Depends(get_db)):
    inv = db.get(PhonemeInventory, inventory_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return _to_response(inv)


@router.get("/languages/{iso_code}", response_model=list[PhonemeInventoryResponse])
def get_by_language(iso_code: str, db: Session = Depends(get_db)):
    inventories = db.query(PhonemeInventory).filter(
        PhonemeInventory.iso639_3 == iso_code
    ).all()
    if not inventories:
        raise HTTPException(status_code=404, detail="No inventories found for this ISO code")
    return [_to_response(inv) for inv in inventories]
