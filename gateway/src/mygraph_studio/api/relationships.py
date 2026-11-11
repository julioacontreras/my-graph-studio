from typing import Any

from fastapi import APIRouter, Response

from ..models.graph import Relationship, RelationshipCreate, RelationshipUpdate
from ..services import nodes as svc
from .deps import DbDep

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.post("", response_model=Relationship, status_code=201)
def create_relationship(body: RelationshipCreate, db: DbDep) -> dict[str, Any]:
    return svc.create_relationship(db, body)


@router.patch("/{rel_id}", response_model=Relationship)
def update_relationship(rel_id: int, body: RelationshipUpdate, db: DbDep) -> dict[str, Any]:
    return svc.update_relationship(db, rel_id, body)


@router.delete("/{rel_id}", status_code=204)
def delete_relationship(rel_id: int, db: DbDep) -> Response:
    svc.delete_relationship(db, rel_id)
    return Response(status_code=204)
