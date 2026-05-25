"""Speech Accent Archive integration — scrape accent.gmu.edu for speaker data."""

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
SOURCE = "speech_accent_archive"
BASE_URL = "https://accent.gmu.edu"
USER_AGENT = "DialectCoachingApp/0.1 (research; respectful-crawl)"
RATE_LIMIT_SECONDS = 1.0

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

class LanguageLinkParser(HTMLParser):
    """Parse browse_language.php to extract language links."""

    def __init__(self):
        super().__init__()
        self.language_links: list[tuple[str, str]] = []  # (url, language_name)
        self._in_link = False
        self._current_href = ""
        self._current_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if href and "browse_language.php?function=find&language=" in href:
                self._in_link = True
                self._current_href = href
                self._current_text = ""

    def handle_data(self, data: str):
        if self._in_link:
            self._current_text += data

    def handle_endtag(self, tag: str):
        if tag == "a" and self._in_link:
            self._in_link = False
            if self._current_href and self._current_text.strip():
                self.language_links.append((self._current_href, self._current_text.strip()))


class SpeakerLinkParser(HTMLParser):
    """Parse a language page to find individual speaker links."""

    def __init__(self):
        super().__init__()
        self.speaker_links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if href and "browse_language.php?function=detail&speakerid=" in href:
                self.speaker_links.append(href)


class SpeakerDetailParser(HTMLParser):
    """Parse an individual speaker page for demographics + audio URL."""

    def __init__(self):
        super().__init__()
        self.data: dict[str, str] = {}
        self.audio_url: str = ""
        self._collecting_text = False
        self._current_tag = ""
        self._all_text_parts: list[str] = []
        self._in_ul = 0
        self._li_texts: list[str] = []
        self._in_li = False
        self._li_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]):
        attr_dict = dict(attrs)
        if tag == "source" or tag == "audio":
            src = attr_dict.get("src", "")
            if src and src.endswith(".mp3"):
                if not src.startswith("http"):
                    src = BASE_URL + "/" + src.lstrip("/")
                self.audio_url = src
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

    def get_demographics(self) -> dict[str, str]:
        """Extract demographics from the collected list items."""
        result: dict[str, str] = {}
        for text in self._li_texts:
            lower = text.lower()
            if ":" in text:
                key, _, value = text.partition(":")
                key = key.strip().lower()
                value = value.strip()
                if "birth" in key and "place" in key:
                    result["birthplace"] = value
                elif "native" in key and "language" in key:
                    result["native_language"] = value
                elif "age" in key:
                    result["age"] = value
                elif "sex" in key or "gender" in key:
                    result["sex"] = value
                elif "country" in key:
                    result["birth_country"] = value
            elif "female" in lower:
                result["sex"] = "female"
            elif "male" in lower:
                result["sex"] = "male"
        return result


# ---------------------------------------------------------------------------
# Scraping logic
# ---------------------------------------------------------------------------

def _get_language_list() -> list[tuple[str, str]]:
    """Return list of (relative_url, language_name) from the browse page."""
    html = _fetch(f"{BASE_URL}/browse_language.php")
    parser = LanguageLinkParser()
    parser.feed(html)
    return parser.language_links


def _get_speakers_for_language(language_url: str) -> list[str]:
    """Return list of speaker detail relative URLs for a language page."""
    if not language_url.startswith("http"):
        url = f"{BASE_URL}/{language_url.lstrip('/')}"
    else:
        url = language_url
    html = _fetch(url)
    parser = SpeakerLinkParser()
    parser.feed(html)
    return parser.speaker_links


def _get_speaker_detail(detail_url: str) -> dict:
    """Fetch and parse a single speaker detail page."""
    if not detail_url.startswith("http"):
        url = f"{BASE_URL}/{detail_url.lstrip('/')}"
    else:
        url = detail_url
    html = _fetch(url)
    parser = SpeakerDetailParser()
    parser.feed(html)
    demographics = parser.get_demographics()

    # Extract speaker ID from URL
    speaker_id = ""
    if "speakerid=" in detail_url:
        speaker_id = detail_url.split("speakerid=")[-1].split("&")[0]

    return {
        "speaker_id": speaker_id,
        "audio_url": parser.audio_url,
        **demographics,
    }


def _map_age_to_range(age_str: str) -> str | None:
    """Convert an age string to an age range bucket."""
    try:
        age = int(age_str.strip().split()[0])
    except (ValueError, IndexError):
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


def _find_region(db: Session, country: str | None, place: str | None) -> int | None:
    """Try to match a region by country name."""
    if not country:
        return None
    region = db.query(Region).filter(
        Region.name.ilike(country.strip()),
        Region.region_type == "country",
    ).first()
    if region:
        return region.id
    # Fallback: search by path containing the country name
    region = db.query(Region).filter(
        Region.path.ilike(f"%/{country.strip()}"),
    ).first()
    return region.id if region else None


# ---------------------------------------------------------------------------
# Background sync job
# ---------------------------------------------------------------------------

def start_sync(job_id: int):
    """Queue a background sync of the Speech Accent Archive."""
    executor.submit(_run_sync, job_id)


def _run_sync(job_id: int):
    db: Session = SessionLocal()
    try:
        job = db.get(ImportJob, job_id)
        if not job:
            return
        job.status = "processing"
        db.commit()

        # Step 1: get language listing
        try:
            language_links = _get_language_list()
        except Exception as e:
            job.status = "error"
            job.error_message = f"Failed to fetch language listing: {e}"
            db.commit()
            return

        time.sleep(RATE_LIMIT_SECONDS)

        # Step 2: for each language, get speaker links
        all_speakers: list[tuple[str, str]] = []  # (detail_url, language_name)
        for lang_url, lang_name in language_links:
            try:
                speaker_links = _get_speakers_for_language(lang_url)
                for sl in speaker_links:
                    all_speakers.append((sl, lang_name))
            except Exception:
                pass  # skip languages that fail
            time.sleep(RATE_LIMIT_SECONDS)

        # Deduplicate by speaker URL
        seen_urls: set[str] = set()
        unique_speakers: list[tuple[str, str]] = []
        for url, lang in all_speakers:
            if url not in seen_urls:
                seen_urls.add(url)
                unique_speakers.append((url, lang))

        job.total_entries = len(unique_speakers)
        db.commit()

        # Step 3: process each speaker
        for i, (detail_url, language_name) in enumerate(unique_speakers):
            try:
                _process_speaker(db, detail_url, language_name)
                job.processed_entries = i + 1
                db.commit()
            except Exception as e:
                db.rollback()
                job = db.get(ImportJob, job_id)
                job.error_message = (job.error_message or "") + f"\nSpeaker {i}: {e}"
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


def _process_speaker(db: Session, detail_url: str, language_name: str):
    """Fetch speaker detail, create/update records."""
    detail = _get_speaker_detail(detail_url)
    external_id = detail.get("speaker_id", "")
    if not external_id:
        return

    # Deduplicate
    existing = db.query(Speaker).filter(
        Speaker.source == SOURCE,
        Speaker.external_id == external_id,
    ).first()
    if existing:
        return  # already imported

    # Map region
    region_id = _find_region(
        db,
        detail.get("birth_country"),
        detail.get("birthplace"),
    )

    sex = detail.get("sex", "")
    gender = sex.lower() if sex else None

    speaker = Speaker(
        name=f"Speaker {external_id}",
        origin_region_id=region_id,
        age_range=_map_age_to_range(detail.get("age", "")),
        gender=gender,
        notes=f"Native language: {language_name}. Birthplace: {detail.get('birthplace', 'unknown')}.",
        source=SOURCE,
        external_id=external_id,
    )
    db.add(speaker)
    db.flush()

    # Download audio
    audio_url = detail.get("audio_url", "")
    if not audio_url:
        return

    stored_filename = f"{uuid.uuid4().hex}.mp3"
    dest = AUDIO_DIR / stored_filename
    _download_file(audio_url, dest)

    # Sentinel project
    project_name = "[SPEECH_ACCENT_ARCHIVE Imports]"
    imports_project = db.query(Project).filter(Project.name == project_name).first()
    if not imports_project:
        imports_project = Project(
            name=project_name,
            description="Auto-created for Speech Accent Archive corpus imports",
        )
        db.add(imports_project)
        db.flush()

    audio = AudioResource(
        project_id=imports_project.id,
        original_filename=f"saa_{external_id}.mp3",
        stored_filename=stored_filename,
        status="pending",
    )
    db.add(audio)
    db.flush()

    sample = SpeakerSample(
        speaker_id=speaker.id,
        audio_resource_id=audio.id,
        notes=f"Imported from Speech Accent Archive. Language: {language_name}.",
    )
    db.add(sample)
    db.flush()
