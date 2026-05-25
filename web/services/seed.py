import json
from pathlib import Path

from sqlalchemy.orm import Session


def seed_accent_profiles(db: Session) -> None:
    from web.models import AccentProfile, Region, SignaturePattern

    if db.query(AccentProfile).filter(AccentProfile.is_seed == 1).count() > 0:
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
            is_seed=1,
            source="manual",
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
