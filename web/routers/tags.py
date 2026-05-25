from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Tag
from web.schemas import TagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str


@router.get("", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "sample_count": len(t.samples),
        }
        for t in tags
    ]


@router.post("", response_model=TagResponse, status_code=201)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    name = data.name.strip().lower()
    if not name:
        raise HTTPException(400, "Tag name cannot be empty")
    existing = db.query(Tag).filter(Tag.name == name).first()
    if existing:
        raise HTTPException(409, "Tag already exists")
    tag = Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return {"id": tag.id, "name": tag.name, "sample_count": 0}


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if not tag:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()
