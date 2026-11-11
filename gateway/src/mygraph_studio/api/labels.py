from typing import Annotated, Any

from fastapi import APIRouter, Query, Response

from ..models.labels import LabelDefinition, LabelDefinitionIn, LabelDefinitionOut, Violation
from ..services import labels as svc
from .deps import DbDep, ScopeDep, StoreDep

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelDefinitionOut], response_model_by_alias=True)
def list_labels(db: DbDep, store: StoreDep, scope: ScopeDep) -> list[LabelDefinitionOut]:
    return svc.list_definitions(db, store, scope)


@router.get("/detect")
def detect(
    db: DbDep, store: StoreDep, scope: ScopeDep, sample: Annotated[int, Query(ge=1, le=10000)] = 500
) -> list[dict[str, Any]]:
    """Propone definiciones a partir de una muestra de nodos. No guarda nada."""
    return svc.detect(db, store, scope, sample)


@router.post("", response_model=LabelDefinition, response_model_by_alias=True, status_code=201)
def create_label(body: LabelDefinitionIn, db: DbDep, store: StoreDep, scope: ScopeDep) -> LabelDefinition:
    return svc.create_definition(db, store, scope, body)


@router.put("/{label}", response_model=LabelDefinition, response_model_by_alias=True)
def update_label(label: str, body: LabelDefinitionIn, db: DbDep, store: StoreDep, scope: ScopeDep) -> LabelDefinition:
    return svc.update_definition(db, store, scope, label, body)


@router.delete("/{label}", status_code=204)
def delete_label(label: str, db: DbDep, store: StoreDep, scope: ScopeDep, drop_indexes: bool = False) -> Response:
    """Borra la definición. No borra nodos."""
    svc.delete_definition(db, store, scope, label, drop_indexes)
    return Response(status_code=204)


@router.get("/{label}/violations", response_model=list[Violation])
def label_violations(label: str, db: DbDep, store: StoreDep, scope: ScopeDep) -> list[Violation]:
    return svc.violations(db, store, scope, label)
