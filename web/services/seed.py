import json
from pathlib import Path

from sqlalchemy.orm import Session


def seed_regions(db: Session) -> None:
    """Load regions from JSON if table is empty."""
    from web.models import Region

    if db.query(Region).filter(Region.is_seed == 1).count() > 0:
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
            is_seed=1,
        )
        db.add(region)
        db.flush()
        if "children" in item:
            _insert_regions_recursive(db, item["children"], region.id)
