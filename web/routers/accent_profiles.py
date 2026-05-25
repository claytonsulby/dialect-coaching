from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import AccentProfile, SignaturePattern
from web.schemas import (
    AccentComparisonResponse,
    AccentProfileCreate,
    AccentProfileResponse,
    AccentProfileUpdate,
    SignaturePatternCreate,
    SignaturePatternResponse,
    SignaturePatternUpdate,
)

router = APIRouter(prefix="/api/accent-profiles", tags=["accent-profiles"])


@router.get("", response_model=list[AccentProfileResponse])
def list_profiles(
    region_id: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(AccentProfile)
    if region_id is not None:
        q = q.filter(AccentProfile.region_id == region_id)
    if search:
        q = q.filter(AccentProfile.name.ilike(f"%{search}%"))
    return q.order_by(AccentProfile.name).all()


@router.post("", response_model=AccentProfileResponse, status_code=201)
def create_profile(data: AccentProfileCreate, db: Session = Depends(get_db)):
    profile = AccentProfile(
        name=data.name,
        description=data.description,
        region_id=data.region_id,
    )
    db.add(profile)
    db.flush()
    for p in data.patterns:
        db.add(
            SignaturePattern(
                accent_profile_id=profile.id,
                expected_phone=p.expected_phone,
                actual_phone=p.actual_phone,
                frequency=p.frequency,
                notes=p.notes,
            )
        )
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=AccentProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.get(AccentProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Accent profile not found")
    return profile


@router.put("/{profile_id}", response_model=AccentProfileResponse)
def update_profile(
    profile_id: int, data: AccentProfileUpdate, db: Session = Depends(get_db)
):
    profile = db.get(AccentProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Accent profile not found")
    if data.name is not None:
        profile.name = data.name
    if data.description is not None:
        profile.description = data.description
    if data.region_id is not None:
        profile.region_id = data.region_id
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=204)
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.get(AccentProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Accent profile not found")
    db.delete(profile)
    db.commit()


# --- Pattern endpoints ---


@router.post(
    "/{profile_id}/patterns",
    response_model=SignaturePatternResponse,
    status_code=201,
)
def add_pattern(
    profile_id: int, data: SignaturePatternCreate, db: Session = Depends(get_db)
):
    profile = db.get(AccentProfile, profile_id)
    if not profile:
        raise HTTPException(404, "Accent profile not found")
    pattern = SignaturePattern(
        accent_profile_id=profile_id,
        expected_phone=data.expected_phone,
        actual_phone=data.actual_phone,
        frequency=data.frequency,
        notes=data.notes,
    )
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return pattern


@router.put(
    "/{profile_id}/patterns/{pattern_id}",
    response_model=SignaturePatternResponse,
)
def update_pattern(
    profile_id: int,
    pattern_id: int,
    data: SignaturePatternUpdate,
    db: Session = Depends(get_db),
):
    pattern = (
        db.query(SignaturePattern)
        .filter(
            SignaturePattern.id == pattern_id,
            SignaturePattern.accent_profile_id == profile_id,
        )
        .first()
    )
    if not pattern:
        raise HTTPException(404, "Pattern not found")
    if data.expected_phone is not None:
        pattern.expected_phone = data.expected_phone
    if data.actual_phone is not None:
        pattern.actual_phone = data.actual_phone
    if data.frequency is not None:
        pattern.frequency = data.frequency
    if data.notes is not None:
        pattern.notes = data.notes
    db.commit()
    db.refresh(pattern)
    return pattern


@router.delete("/{profile_id}/patterns/{pattern_id}", status_code=204)
def delete_pattern(
    profile_id: int, pattern_id: int, db: Session = Depends(get_db)
):
    pattern = (
        db.query(SignaturePattern)
        .filter(
            SignaturePattern.id == pattern_id,
            SignaturePattern.accent_profile_id == profile_id,
        )
        .first()
    )
    if not pattern:
        raise HTTPException(404, "Pattern not found")
    db.delete(pattern)
    db.commit()


# --- Aggregation & Comparison ---


@router.post("/{profile_id}/aggregate", response_model=AccentProfileResponse)
def aggregate_profile(profile_id: int, db: Session = Depends(get_db)):
    from web.services.accent_analysis import aggregate_accent_signature

    profile = aggregate_accent_signature(db, profile_id)
    if not profile:
        raise HTTPException(404, "Accent profile not found")
    return profile


@router.get("/{profile_id}/compare", response_model=AccentComparisonResponse)
def compare_profiles(
    profile_id: int,
    compare_to: int = Query(...),
    db: Session = Depends(get_db),
):
    profile_a = db.get(AccentProfile, profile_id)
    if not profile_a:
        raise HTTPException(404, "Accent profile not found")
    profile_b = db.get(AccentProfile, compare_to)
    if not profile_b:
        raise HTTPException(404, "Comparison profile not found")

    patterns_a = {
        (p.expected_phone, p.actual_phone): p for p in profile_a.patterns
    }
    patterns_b = {
        (p.expected_phone, p.actual_phone): p for p in profile_b.patterns
    }

    shared_keys = set(patterns_a.keys()) & set(patterns_b.keys())
    unique_a_keys = set(patterns_a.keys()) - shared_keys
    unique_b_keys = set(patterns_b.keys()) - shared_keys

    def pattern_dict(p: SignaturePattern) -> dict:
        return {
            "id": p.id,
            "expected_phone": p.expected_phone,
            "actual_phone": p.actual_phone,
            "frequency": p.frequency,
            "occurrence_count": p.occurrence_count,
            "notes": p.notes,
        }

    shared_patterns = []
    for key in shared_keys:
        shared_patterns.append(
            {
                "expected_phone": key[0],
                "actual_phone": key[1],
                "frequency_a": patterns_a[key].frequency,
                "frequency_b": patterns_b[key].frequency,
                "notes_a": patterns_a[key].notes,
                "notes_b": patterns_b[key].notes,
            }
        )

    return AccentComparisonResponse(
        profile_a=profile_a,
        profile_b=profile_b,
        shared_patterns=shared_patterns,
        unique_to_a=[pattern_dict(patterns_a[k]) for k in unique_a_keys],
        unique_to_b=[pattern_dict(patterns_b[k]) for k in unique_b_keys],
    )
