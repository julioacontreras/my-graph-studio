from typing import Annotated, Any

from fastapi import APIRouter, Depends

from ..config import Settings, get_settings
from ..db.serialize import to_json
from ..db.session import Scope, open_session
from .deps import DbDep

router = APIRouter(prefix="/databases", tags=["databases"])


@router.get("")
def list_databases(db: DbDep) -> list[dict[str, Any]]:
    return to_json(db.databases())


@router.get("/{database}/schemas")
def list_schemas(database: str, settings: Annotated[Settings, Depends(get_settings)]) -> list[dict[str, Any]]:
    with open_session(settings, Scope(database=database)) as db:
        return to_json(db.schemas())
