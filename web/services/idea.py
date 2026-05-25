"""IDEA (International Dialects of English Archive) integration — scrape dialectsarchive.com for speaker data."""

import time
import uuid
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from web.database import DATA_DIR, SessionLocal
from web.models import AudioResource, ImportJob, Project, Region, Speaker, SpeakerSample

AUDIO_DIR = DATA_DIR / "audio"
SOURCE = "idea"
BASE_URL = "https://www.dialectsarchive.com"
USER_AGENT = "DialectCoachingApp/0.1 (research; respectful-crawl)"
RATE_LIMIT_SECONDS = 1.0

REGION_SLUGS = [
    "africa",
    "asia",
    "australia-oceania",
    "caribbean",
    "central-america",
    "europe",
    "middle-east",
    "north-america",
    "south-america",
]

executor = ThreadPoolExecutor(max_workers=1)


def _fetch(url: str) -> str:
    """Fetch a URL with rate limiting and User-Agent header."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _download_file(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


# ---------------------------------------------------------------------------
# HTML parsers (stdlib only)
# ---------------------------------------------------------------------------

class SubpageLinkParser(HTMLParser):
    """Parse a region or country page to extract sub-page links.

    Used for:
    - Region pages to find country links
    - Country pages to find sample links (e.g. pennsylvania-1)
    """

    def __init__(self, base_url: str = BASE_URL):
        super().__init__()
        self.links: list[str] = []  # absolute URLs
        self._base_url = base_url

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if not href:
                return
            # Normalize to absolute URL
            if href.startswith("/"):
                href = self._base_url + href
            # Only keep links within the IDEA site
            if href.startswith(self._base_url):
                self.links.append(href)


def _is_sample_slug(slug: str) -> bool:
    """Check if a URL slug looks like a sample (ends with -<number>)."""
    parts = slug.rsplit("-", 1)
    if len(parts) == 2:
        return parts[1].isdigit()
    return False


def _slug_from_url(url: str) -> str:
    """Extract the slug from an IDEA URL."""
    path = url.rstrip("/").split("/")[-1]
    # Strip query strings
    if "?" in path:
        path = path.split("?")[0]
    return path


class SamplePageParser(HTMLParser):
    """Parse an individual IDEA sample page for demographics + audio URL."""

    def __init__(self):
        super().__init__()
        self.audio_url: str = ""
        self._in_ul = 0
        self._in_li = False
        self._li_text = ""
        self._li_texts: list[str] = []
        self._in_a = False
        self._a_href = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]):
        attr_dict = dict(attrs)

        # Audio from <audio> or <source> elements
        if tag in ("audio", "source"):
            src = attr_dict.get("src", "")
            if src and ".mp3" in src:
                if not src.startswith("http"):
                    src = BASE_URL + "/" + src.lstrip("/")
                self.audio_url = src

        # Audio from direct .mp3 links
        if tag == "a":
            href = attr_dict.get("href", "")
            if href and ".mp3" in href:
                if not href.startswith("http"):
                    href = BASE_URL + "/" + href.lstrip("/")
                self.audio_url = href
            self._in_a = True
            self._a_href = href

        if tag == "ul":
            self._in_ul += 1
        if tag == "li" and self._in_ul > 0:
            self._in_li = True
            self._li_text = ""

    def handle_data(self, data: str):
        if self._in_li:
            self._li_text += data

    def handle_endtag(self, tag: str):
        if tag == "li" and self._in_li:
            self._in_li = False
            self._li_texts.append(self._li_text.strip())
        if tag == "ul":
            self._in_ul = max(0, self._in_ul - 1)
        if tag == "a":
            self._in_a = False

    def get_demographics(self) -> dict[str, str]:
        """Extract demographics from the collected list items."""
        result: dict[str, str] = {}
        for text in self._li_texts:
            if ":" not in text:
                continue
            key, _, value = text.partition(":")
            key = key.strip().lower()
            value = value.strip()
            if not value:
                continue

            if "birth" in key and "year" in key:
                result["birth_year"] = value
            elif "birth" in key and "place" in key:
                result["birthplace"] = value
            elif "current" in key and "resid" in key:
                result["current_residence"] = value
            elif "age" in key:
                result["age"] = value
            elif "gender" in key or "sex" in key:
                result["gender"] = value
            elif "ethnic" in key:
                result["ethnicity"] = value
        return result


# ---------------------------------------------------------------------------
# Scraping logic
# ---------------------------------------------------------------------------

def _get_region_links() -> list[str]:
    """Return absolute URLs for all region pages from /dialects-accents."""
    html = _fetch(f"{BASE_URL}/dialects-accents")
    parser = SubpageLinkParser()
    parser.feed(html)

    region_links: list[str] = []
    for link in parser.links:
        slug = _slug_from_url(link)
        if slug in REGION_SLUGS:
            region_links.append(link)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for link in region_links:
        if link not in seen:
            seen.add(link)
            unique.append(link)
    return unique


def _get_country_links(region_url: str) -> list[str]:
    """Return absolute URLs for country/sub-region pages from a region page."""
    html = _fetch(region_url)
    parser = SubpageLinkParser()
    parser.feed(html)

    country_links: list[str] = []
    for link in parser.links:
        slug = _slug_from_url(link)
        # Skip region slugs, sample slugs, and non-content pages
        if slug in REGION_SLUGS:
            continue
        if _is_sample_slug(slug):
            continue
        if slug in ("", "dialects-accents", "#"):
            continue
        # Skip common non-content paths
        if any(x in slug for x in ("wp-", "feed", "comment", "login", "admin")):
            continue
        country_links.append(link)

    seen: set[str] = set()
    unique: list[str] = []
    for link in country_links:
        if link not in seen:
            seen.add(link)
            unique.append(link)
    return unique


def _get_sample_links(country_url: str) -> tuple[list[str], list[str]]:
    """Return absolute URLs for sample pages from a country/state page.

    For the US, this page may list state sub-pages rather than samples directly.
    """
    html = _fetch(country_url)
    parser = SubpageLinkParser()
    parser.feed(html)

    sample_links: list[str] = []
    sub_pages: list[str] = []
    for link in parser.links:
        slug = _slug_from_url(link)
        if _is_sample_slug(slug):
            sample_links.append(link)
        elif slug and slug not in REGION_SLUGS and not any(
            x in slug for x in ("wp-", "feed", "comment", "login", "admin", "dialects-accents")
        ):
            # Could be a state sub-page (for US)
            sub_pages.append(link)

    # Deduplicate samples
    seen: set[str] = set()
    unique: list[str] = []
    for link in sample_links:
        if link not in seen:
            seen.add(link)
            unique.append(link)

    return unique, sub_pages


def _get_sample_detail(sample_url: str) -> dict:
    """Fetch and parse a single sample page."""
    html = _fetch(sample_url)
    parser = SamplePageParser()
    parser.feed(html)
    demographics = parser.get_demographics()

    slug = _slug_from_url(sample_url)

    return {
        "external_id": slug,
        "audio_url": parser.audio_url,
        **demographics,
    }


def _map_age_to_range(age_str: str) -> str | None:
    """Convert an IDEA age string (e.g. '30s', '25') to an age range bucket."""
    if not age_str or not age_str.strip():
        return None
    age_str = age_str.strip().lower().rstrip("s")
    try:
        age = int(age_str)
    except ValueError:
        return age_str.strip() if age_str.strip() else None
    if age < 20:
        return "under 20"
    elif age < 30:
        return "20-29"
    elif age < 40:
        return "30-39"
    elif age < 50:
        return "40-49"
    elif age < 60:
        return "50-59"
    else:
        return "60+"


def _find_region(db: Session, birthplace: str | None) -> int | None:
    """Try to match a region from birthplace string."""
    if not birthplace:
        return None
    # Try last component as country (e.g. "Upper Darby, Pennsylvania" -> "Pennsylvania")
    parts = [p.strip() for p in birthplace.split(",")]
    for part in reversed(parts):
        region = db.query(Region).filter(
            Region.name.ilike(part),
            Region.region_type == "country",
        ).first()
        if region:
            return region.id
    # Fallback: search by path
    for part in reversed(parts):
        region = db.query(Region).filter(
            Region.path.ilike(f"%/{part}"),
        ).first()
        if region:
            return region.id
    return None


# ---------------------------------------------------------------------------
# Background sync job
# ---------------------------------------------------------------------------

def start_sync(job_id: int):
    """Queue a background sync of the IDEA archive."""
    executor.submit(_run_sync, job_id)


def _run_sync(job_id: int):
    db: Session = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        if not job:
            return
        job.status = "processing"
        db.commit()

        # Step 1: get region listing
        try:
            region_links = _get_region_links()
        except Exception as e:
            job.status = "error"
            job.error_message = f"Failed to fetch region listing: {e}"
            db.commit()
            return

        time.sleep(RATE_LIMIT_SECONDS)

        # Step 2: for each region, get country links
        all_country_links: list[str] = []
        for region_url in region_links:
            try:
                country_links = _get_country_links(region_url)
                all_country_links.extend(country_links)
            except Exception:
                pass
            time.sleep(RATE_LIMIT_SECONDS)

        # Deduplicate country links
        seen_countries: set[str] = set()
        unique_countries: list[str] = []
        for link in all_country_links:
            if link not in seen_countries:
                seen_countries.add(link)
                unique_countries.append(link)

        # Step 3: for each country, get sample links
        all_samples: list[str] = []
        for country_url in unique_countries:
            try:
                samples, sub_pages = _get_sample_links(country_url)
                all_samples.extend(samples)
                # For countries with sub-pages (like US states), drill deeper
                for sub_url in sub_pages:
                    try:
                        sub_samples, _ = _get_sample_links(sub_url)
                        all_samples.extend(sub_samples)
                    except Exception:
                        pass
                    time.sleep(RATE_LIMIT_SECONDS)
            except Exception:
                pass
            time.sleep(RATE_LIMIT_SECONDS)

        # Deduplicate samples
        seen_samples: set[str] = set()
        unique_samples: list[str] = []
        for link in all_samples:
            if link not in seen_samples:
                seen_samples.add(link)
                unique_samples.append(link)

        job.total_entries = len(unique_samples)
        db.commit()

        # Step 4: process each sample
        for i, sample_url in enumerate(unique_samples):
            try:
                _process_speaker(db, sample_url)
                job.processed_entries = i + 1
                db.commit()
            except Exception as e:
                db.rollback()
                job = db.get(ImportJob, job_id)
                job.error_message = (job.error_message or "") + f"\nSample {i}: {e}"
                job.processed_entries = i + 1
                db.commit()
            time.sleep(RATE_LIMIT_SECONDS)

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


def _process_speaker(db: Session, sample_url: str):
    """Fetch sample detail, create/update records."""
    detail = _get_sample_detail(sample_url)
    external_id = detail.get("external_id", "")
    if not external_id:
        return

    # Deduplicate
    existing = db.query(Speaker).filter(
        Speaker.source == SOURCE,
        Speaker.external_id == external_id,
    ).first()
    if existing:
        return  # already imported

    # Map region from birthplace
    region_id = _find_region(db, detail.get("birthplace"))

    gender_raw = detail.get("gender", "")
    gender = gender_raw.strip().lower() if gender_raw else None

    age_str = detail.get("age", "")
    # If no age field but birth_year present, leave age_range as birth_year info
    if not age_str and detail.get("birth_year"):
        age_str = detail["birth_year"]

    ethnicity = detail.get("ethnicity", "")
    birthplace = detail.get("birthplace", "unknown")
    current_residence = detail.get("current_residence", "")

    notes_parts = [f"Birthplace: {birthplace}"]
    if ethnicity:
        notes_parts.append(f"Ethnicity: {ethnicity}")
    if current_residence:
        notes_parts.append(f"Current residence: {current_residence}")
    if detail.get("birth_year"):
        notes_parts.append(f"Birth year: {detail['birth_year']}")

    speaker = Speaker(
        name=f"IDEA {external_id}",
        origin_region_id=region_id,
        age_range=_map_age_to_range(age_str),
        gender=gender,
        notes=". ".join(notes_parts) + ".",
        source=SOURCE,
        external_id=external_id,
    )
    db.add(speaker)
    db.flush()

    # Download audio
    audio_url = detail.get("audio_url", "")
    if not audio_url:
        return

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}.mp3"
    dest = AUDIO_DIR / stored_filename
    _download_file(audio_url, dest)

    # Sentinel project
    project_name = "[IDEA Imports]"
    imports_project = db.query(Project).filter(Project.name == project_name).first()
    if not imports_project:
        imports_project = Project(
            name=project_name,
            description="Auto-created for IDEA corpus imports",
        )
        db.add(imports_project)
        db.flush()

    audio = AudioResource(
        project_id=imports_project.id,
        original_filename=f"idea_{external_id}.mp3",
        stored_filename=stored_filename,
        status="pending",
    )
    db.add(audio)
    db.flush()

    sample = SpeakerSample(
        speaker_id=speaker.id,
        audio_resource_id=audio.id,
        notes=f"Imported from IDEA (International Dialects of English Archive).",
    )
    db.add(sample)
    db.flush()
