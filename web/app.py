from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from web.database import SessionLocal, init_db
from web.routers import accent_profiles, actors, audio, common_voice, discovery, forvo, imports, phonemes, projects, regions, samples, settings, speakers, speech_accent_archive, tags

app = FastAPI(title="Dialect Coaching")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(actors.router)
app.include_router(audio.router)
app.include_router(regions.router)
app.include_router(speakers.router)
app.include_router(accent_profiles.router)
app.include_router(samples.router)
app.include_router(tags.router)
app.include_router(imports.router)
app.include_router(discovery.router)
app.include_router(phonemes.router)
app.include_router(common_voice.router)
app.include_router(speech_accent_archive.router)
app.include_router(forvo.router)
app.include_router(settings.router)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


@app.on_event("startup")
def startup():
    init_db()
    from web.services.seed import seed_accent_profiles, seed_regions

    db = SessionLocal()
    try:
        seed_regions(db)
        seed_accent_profiles(db)
        _auto_sync_corpora(db)
    finally:
        db.close()


def _auto_sync_corpora(db):
    """Trigger SAA and PHOIBLE syncs on first run (background, non-blocking)."""
    from web.models import AppSetting, ImportJob

    # Speech Accent Archive
    if not db.query(AppSetting).filter(AppSetting.key == "saa_auto_synced").first():
        from web.services.speech_accent_archive import start_sync

        job = ImportJob(source="speech_accent_archive", status="pending", total_entries=0)
        db.add(job)
        db.commit()
        db.refresh(job)
        start_sync(job.id)
        db.add(AppSetting(key="saa_auto_synced", value="true"))
        db.commit()

    # PHOIBLE
    if not db.query(AppSetting).filter(AppSetting.key == "phoible_auto_synced").first():
        from web.services.phoible import start_phoible_sync

        job = ImportJob(source="phoible", status="pending", total_entries=0)
        db.add(job)
        db.commit()
        db.refresh(job)
        start_phoible_sync(job.id)
        db.add(AppSetting(key="phoible_auto_synced", value="true"))
        db.commit()
