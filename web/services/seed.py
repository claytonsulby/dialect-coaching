import json
from pathlib import Path

from sqlalchemy.orm import Session


def seed_regions(db: Session) -> None:
    """Load regions from JSON if table is empty."""
    from web.models import Region

    if db.query(Region).filter(Region.source == "bundled").count() > 0:
        return

    data = json.loads(
        (Path(__file__).parent.parent / "seed_data" / "regions.json").read_text()
    )
    _insert_regions_recursive(db, data, parent_id=None)
    db.commit()


def _insert_regions_recursive(db: Session, items: list, parent_id: int | None) -> None:
    from web.models import Region

    for item in items:
        region = Region(
            name=item["name"],
            region_type=item["region_type"],
            parent_id=parent_id,
            path=item["path"],
            iso_code=item.get("iso_code"),
            source="bundled",
        )
        db.add(region)
        db.flush()
        if "children" in item:
            _insert_regions_recursive(db, item["children"], region.id)


def seed_accent_profiles(db: Session) -> None:
    """Load accent profiles from JSON if table is empty."""
    from web.models import AccentProfile, Region, SignaturePattern

    if db.query(AccentProfile).filter(AccentProfile.source == "bundled").count() > 0:
        return

    data_path = Path(__file__).parent.parent / "seed_data" / "accent_profiles.json"
    if not data_path.exists():
        return

    data = json.loads(data_path.read_text())
    for profile_data in data:
        region = None
        if "region_path" in profile_data:
            region = (
                db.query(Region)
                .filter(Region.path == profile_data["region_path"])
                .first()
            )

        profile = AccentProfile(
            name=profile_data["name"],
            description=profile_data.get("description", ""),
            region_id=region.id if region else None,
            source="bundled",
        )
        db.add(profile)
        db.flush()

        for p in profile_data.get("patterns", []):
            db.add(
                SignaturePattern(
                    accent_profile_id=profile.id,
                    expected_phone=p["expected_phone"],
                    actual_phone=p["actual_phone"],
                    frequency=p.get("frequency", 0.0),
                    occurrence_count=p.get("occurrence_count", 0),
                    notes=p.get("notes", ""),
                )
            )

    db.commit()
