from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from web.database import get_db
from web.models import Actor, Project
from web.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [
        ProjectResponse(
            id=p.id, name=p.name, description=p.description,
            created_at=p.created_at, actors=p.actors,
            audio_count=len(p.audio_resources),
        )
        for p in projects
    ]


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(name=data.name, description=data.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        created_at=project.created_at, actors=[], audio_count=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        created_at=project.created_at, actors=project.actors,
        audio_count=len(project.audio_resources),
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    db.commit()
    db.refresh(project)
    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        created_at=project.created_at, actors=project.actors,
        audio_count=len(project.audio_resources),
    )


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/actors/{actor_id}", status_code=204)
def assign_actor(project_id: int, actor_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    if actor not in project.actors:
        project.actors.append(actor)
        db.commit()


@router.delete("/{project_id}/actors/{actor_id}", status_code=204)
def remove_actor(project_id: int, actor_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    actor = db.get(Actor, actor_id)
    if not actor:
        raise HTTPException(404, "Actor not found")
    if actor in project.actors:
        project.actors.remove(actor)
        db.commit()
