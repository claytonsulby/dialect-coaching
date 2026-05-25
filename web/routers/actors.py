from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Actor, Speaker
from web.schemas import ActorCreate, ActorResponse, ActorUpdate

router = APIRouter(prefix="/api/actors", tags=["actors"])


def _actor_to_response(actor: Actor) -> dict:
    return {
        "id": actor.id,
        "name": actor.name,
        "notes": actor.notes,
        "speaker_id": actor.speaker_id,
        "speaker_name": actor.speaker.name if actor.speaker else None,
        "created_at": actor.created_at,
        "projects": actor.projects,
    }


@router.get("", response_model=list[ActorResponse])
def list_actors(db: Session = Depends(get_db)):
    actors = db.query(Actor).order_by(Actor.name).all()
    return [_actor_to_response(a) for a in actors]


@router.post("", response_model=ActorResponse, status_code=201)
def create_actor(data: ActorCreate, db: Session = Depends(get_db)):
    actor = Actor(name=data.name, notes=data.notes, speaker_id=data.speaker_id)
    db.add(actor)
    db.commit()
    db.refresh(actor)
    return _actor_to_response(actor)


@router.get("/{actor_id}", response_model=ActorResponse)
def get_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    return _actor_to_response(actor)


@router.put("/{actor_id}", response_model=ActorResponse)
def update_actor(actor_id: int, data: ActorUpdate, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    if data.name is not None:
        actor.name = data.name
    if data.notes is not None:
        actor.notes = data.notes
    db.commit()
    db.refresh(actor)
    return _actor_to_response(actor)


@router.post("/{actor_id}/link-speaker/{speaker_id}", response_model=ActorResponse)
def link_speaker(actor_id: int, speaker_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    speaker = db.get(Speaker, speaker_id)
    if not speaker:
        raise HTTPException(404, "Speaker not found")
    actor.speaker_id = speaker_id
    db.commit()
    db.refresh(actor)
    return _actor_to_response(actor)


@router.delete("/{actor_id}/link-speaker", response_model=ActorResponse)
def unlink_speaker(actor_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    actor.speaker_id = None
    db.commit()
    db.refresh(actor)
    return _actor_to_response(actor)


@router.delete("/{actor_id}", status_code=204)
def delete_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    db.delete(actor)
    db.commit()
