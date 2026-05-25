from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Actor
from web.schemas import ActorCreate, ActorResponse, ActorUpdate

router = APIRouter(prefix="/api/actors", tags=["actors"])


@router.get("", response_model=list[ActorResponse])
def list_actors(db: Session = Depends(get_db)):
    return db.query(Actor).order_by(Actor.name).all()


@router.post("", response_model=ActorResponse, status_code=201)
def create_actor(data: ActorCreate, db: Session = Depends(get_db)):
    actor = Actor(name=data.name, notes=data.notes)
    db.add(actor)
    db.commit()
    db.refresh(actor)
    return actor


@router.get("/{actor_id}", response_model=ActorResponse)
def get_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    return actor


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
    return actor


@router.delete("/{actor_id}", status_code=204)
def delete_actor(actor_id: int, db: Session = Depends(get_db)):
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    db.delete(actor)
    db.commit()
