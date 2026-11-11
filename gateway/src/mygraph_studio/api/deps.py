from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

import mygraph
from fastapi import Depends, Query

from ..config import Settings, get_settings
from ..db.session import Scope, open_session
from ..store.label_store import LabelStore


def get_scope(
    database: Annotated[str, Query(min_length=1)] = "default",
    schema: Annotated[str, Query(min_length=1)] = "public",
) -> Scope:
    return Scope(database=database, schema=schema)


def get_db(
    scope: Annotated[Scope, Depends(get_scope)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Iterator[mygraph.Client]:
    """Una conexión por petición; se cierra al terminar la respuesta."""
    with open_session(settings, scope) as client:
        yield client


@lru_cache
def _store(path: str) -> LabelStore:
    return LabelStore(path)


def get_store(settings: Annotated[Settings, Depends(get_settings)]) -> LabelStore:
    return _store(str(settings.studio_db_path))


ScopeDep = Annotated[Scope, Depends(get_scope)]
DbDep = Annotated[mygraph.Client, Depends(get_db)]
StoreDep = Annotated[LabelStore, Depends(get_store)]
