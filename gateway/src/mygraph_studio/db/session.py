"""Conexiones a mygraph-server.

Cada petición HTTP abre su propia conexión, fija la base de datos y el schema
y la cierra al terminar. Cerrar la conexión hace rollback de cualquier
transacción abierta, así que nunca queda una transacción entre peticiones.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass

import mygraph

from ..config import Settings


@dataclass(frozen=True)
class Scope:
    database: str = "default"
    schema: str = "public"


@contextmanager
def open_session(settings: Settings, scope: Scope) -> Iterator[mygraph.Client]:
    client = mygraph.connect(settings.mygraph_host, settings.mygraph_port, timeout=settings.mygraph_timeout)
    try:
        client.use_database(scope.database)
        client.use_schema(scope.schema)
        yield client
    finally:
        client.close()
