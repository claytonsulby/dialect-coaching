from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from web.database import SessionLocal, init_db
from web.routers import actors, audio, projects, regions

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

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


@app.on_event("startup")
def startup():
    init_db()
    from web.services.seed import seed_regions

    db = SessionLocal()
    try:
        seed_regions(db)
    finally:
        db.close()
