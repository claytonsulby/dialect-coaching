from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Region
from web.schemas import (
    RegionBrief,
    RegionCreate,
    RegionResponse,
    RegionSearchResult,
    RegionUpdate,
)

router = APIRouter(prefix="/api/regions", tags=["regions"])


def _slugify(name: str) -> str:
    return name.lower().replace(" ", "_").replace("'", "")


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters in user input."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _build_response(region: Region) -> RegionResponse:
    children = [
        RegionBrief(id=c.id, name=c.name, region_type=c.region_type, path=c.path, is_seed=bool(c.is_seed))
        for c in sorted(region.children, key=lambda c: c.name)
    ]
    return RegionResponse(
        id=region.id,
        name=region.name,
        region_type=region.region_type,
        path=region.path,
        iso_code=region.iso_code,
        parent_id=region.parent_id,
        is_seed=bool(region.is_seed),
        children=children,
        created_at=region.created_at,
    )


@router.get("/search", response_model=list[RegionSearchResult])
def search_regions(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    escaped = _escape_like(q)
    results = (
        db.query(Region)
        .filter(Region.name.ilike(f"%{escaped}%", escape="\\"))
        .order_by(Region.path)
        .limit(50)
        .all()
    )
    return results


@router.get("", response_model=list[RegionResponse])
def list_regions(
    type: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Region).filter(Region.parent_id.is_(None))
    if type:
        query = query.filter(Region.region_type == type)
    if search:
        escaped = _escape_like(search)
        query = query.filter(Region.name.ilike(f"%{escaped}%", escape="\\"))
    regions = query.order_by(Region.name).all()
    return [_build_response(r) for r in regions]


@router.get("/{region_id}", response_model=RegionResponse)
def get_region(region_id: int, db: Session = Depends(get_db)):
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(404, "Region not found")
    return _build_response(region)


@router.get("/{region_id}/descendants", response_model=list[RegionSearchResult])
def get_descendants(region_id: int, db: Session = Depends(get_db)):
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(404, "Region not found")
    escaped_path = _escape_like(region.path)
    descendants = (
        db.query(Region)
        .filter(Region.path.like(f"{escaped_path}/%", escape="\\"))
        .order_by(Region.path)
        .all()
    )
    return descendants


@router.post("", response_model=RegionResponse, status_code=201)
def create_region(data: RegionCreate, db: Session = Depends(get_db)):
    if data.parent_id is not None:
        parent = db.get(Region, data.parent_id)
        if not parent:
            raise HTTPException(404, "Parent region not found")
        path = f"{parent.path}/{_slugify(data.name)}"
    else:
        path = _slugify(data.name)

    region = Region(
        name=data.name,
        region_type=data.region_type,
        parent_id=data.parent_id,
        path=path,
        is_seed=0,
    )
    db.add(region)
    db.commit()
    db.refresh(region)
    return _build_response(region)


@router.put("/{region_id}", response_model=RegionResponse)
def update_region(region_id: int, data: RegionUpdate, db: Session = Depends(get_db)):
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(404, "Region not found")
    if data.name is not None:
        region.name = data.name
    if data.region_type is not None:
        region.region_type = data.region_type
    db.commit()
    db.refresh(region)
    return _build_response(region)


@router.delete("/{region_id}", status_code=204)
def delete_region(region_id: int, db: Session = Depends(get_db)):
    region = db.get(Region, region_id)
    if not region:
        raise HTTPException(404, "Region not found")
    db.delete(region)
    db.commit()
