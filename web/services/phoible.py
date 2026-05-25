import csv
import io
import json
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from sqlalchemy.orm import Session

from web.database import DATA_DIR, SessionLocal
from web.models import ImportJob, PhonemeInventory

PHOIBLE_CSV_URL = "https://raw.githubusercontent.com/phoible/dev/master/data/phoible.csv"
PHOIBLE_DIR = DATA_DIR / "phoible"

executor = ThreadPoolExecutor(max_workers=1)


def start_phoible_sync(job_id: int):
    """Queue PHOIBLE download+import as a background job."""
    executor.submit(_run_phoible_sync, job_id)


def _run_phoible_sync(job_id: int):
    db: Session = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        if not job:
            return
        job.status = "processing"
        db.commit()

        # Download or use cached CSV
        PHOIBLE_DIR.mkdir(parents=True, exist_ok=True)
        csv_path = PHOIBLE_DIR / "phoible.csv"

        if not csv_path.exists():
            urllib.request.urlretrieve(PHOIBLE_CSV_URL, str(csv_path))

        # Parse CSV and group by InventoryID
        inventories: dict[int, dict] = {}
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                inv_id = int(row["InventoryID"])
                if inv_id not in inventories:
                    inventories[inv_id] = {
                        "inventory_id": inv_id,
                        "language_name": row.get("LanguageName", ""),
                        "iso639_3": row.get("ISO6393") or None,
                        "glottocode": row.get("Glottocode") or None,
                        "source_dataset": row.get("Source") or None,
                        "consonants": [],
                        "vowels": [],
                        "tones": [],
                    }
                seg_class = row.get("SegmentClass", "").lower()
                phoneme = row.get("Phoneme", "")
                if not phoneme:
                    continue
                if seg_class == "consonant":
                    inventories[inv_id]["consonants"].append(phoneme)
                elif seg_class == "vowel":
                    inventories[inv_id]["vowels"].append(phoneme)
                elif seg_class == "tone":
                    inventories[inv_id]["tones"].append(phoneme)

        job.total_entries = len(inventories)
        db.commit()

        # Get existing inventory IDs for idempotency
        existing_ids = set(
            r[0] for r in db.query(PhonemeInventory.inventory_id).all()
        )

        processed = 0
        batch = []
        for inv_data in inventories.values():
            processed += 1
            if inv_data["inventory_id"] in existing_ids:
                job.processed_entries = processed
                if processed % 500 == 0:
                    db.commit()
                continue

            batch.append(PhonemeInventory(
                inventory_id=inv_data["inventory_id"],
                language_name=inv_data["language_name"],
                iso639_3=inv_data["iso639_3"],
                glottocode=inv_data["glottocode"],
                source_dataset=inv_data["source_dataset"],
                consonants_json=json.dumps(inv_data["consonants"]),
                vowels_json=json.dumps(inv_data["vowels"]),
                tones_json=json.dumps(inv_data["tones"]),
                total_segments=len(inv_data["consonants"]) + len(inv_data["vowels"]) + len(inv_data["tones"]),
            ))
            job.processed_entries = processed

            if len(batch) >= 200:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        job.status = "completed"
        db.commit()
    except Exception as e:
        try:
            job = db.get(ImportJob, job_id)
            if job:
                job.status = "error"
                job.error_message = str(e)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
