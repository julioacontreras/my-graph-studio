from typing import Annotated, Any

from fastapi import APIRouter, Query, Response

from ..models.graph import Graph, Node, NodeCreate, NodeUpdate
from ..services import nodes as svc
from .deps import DbDep, ScopeDep, StoreDep

router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.post("", response_model=Node, status_code=201)
def create_node(body: NodeCreate, db: DbDep, store: StoreDep, scope: ScopeDep) -> dict[str, Any]:
    return svc.create_node(db, store, scope, body)


@router.patch("/{node_id}", response_model=Node)
def update_node(node_id: int, body: NodeUpdate, db: DbDep, store: StoreDep, scope: ScopeDep) -> dict[str, Any]:
    return svc.update_node(db, store, scope, node_id, body)


@router.delete("/{node_id}", status_code=204)
def delete_node(node_id: int, db: DbDep) -> Response:
    svc.delete_node(db, node_id)
    return Response(status_code=204)


@router.get("/{node_id}/neighbors", response_model=Graph)
def neighbors(node_id: int, db: DbDep, limit: Annotated[int, Query(ge=1, le=2000)] = 100) -> dict[str, Any]:
    return svc.neighbors(db, node_id, limit)
