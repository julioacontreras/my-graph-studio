from typing import Any

from fastapi import APIRouter

from ..db.serialize import to_json
from .deps import DbDep

router = APIRouter(prefix="/indexes", tags=["indexes"])


@router.get("")
def list_indexes(db: DbDep) -> list[dict[str, Any]]:
    return to_json(db.run("SHOW INDEXES").records())
