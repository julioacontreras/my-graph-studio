"""Definiciones de etiqueta del Studio en SQLite.

MyGraph no tiene este concepto: tipos, required/unique, color y descripción
viven aquí, con clave (database, schema, label).
"""

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from ..db.session import Scope
from ..models.labels import LabelDefinition, LabelDefinitionIn, PropertyDefinition

_SCHEMA = (Path(__file__).parent / "schema.sql").read_text()


class LabelStore:
    def __init__(self, path: Path | str):
        self.path = str(path)
        with self._conn() as c:
            c.executescript(_SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        try:
            with conn:  # commit o rollback
                yield conn
        finally:
            conn.close()

    @staticmethod
    def _row(row: sqlite3.Row) -> LabelDefinition:
        return LabelDefinition(
            database=row["database"],
            schema=row["schema"],
            label=row["label"],
            color=row["color"],
            description=row["description"],
            properties=[PropertyDefinition(**p) for p in json.loads(row["properties"])],
        )

    def all(self, scope: Scope) -> list[LabelDefinition]:
        with self._conn() as c:
            rows = c.execute(
                "SELECT * FROM label_definitions WHERE database = ? AND schema = ? ORDER BY label",
                (scope.database, scope.schema),
            ).fetchall()
        return [self._row(r) for r in rows]

    def get(self, scope: Scope, label: str) -> LabelDefinition | None:
        with self._conn() as c:
            row = c.execute(
                "SELECT * FROM label_definitions WHERE database = ? AND schema = ? AND label = ?",
                (scope.database, scope.schema, label),
            ).fetchone()
        return self._row(row) if row else None

    def by_label(self, scope: Scope, labels: list[str]) -> dict[str, LabelDefinition]:
        if not labels:
            return {}
        return {d.label: d for d in self.all(scope) if d.label in labels}

    def exists(self, scope: Scope, label: str) -> bool:
        return self.get(scope, label) is not None

    def save(self, scope: Scope, d: LabelDefinitionIn) -> LabelDefinition:
        props = json.dumps([p.model_dump(mode="json") for p in d.properties])
        with self._conn() as c:
            c.execute(
                """
                INSERT INTO label_definitions (database, schema, label, color, description, properties)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (database, schema, label) DO UPDATE SET
                    color = excluded.color,
                    description = excluded.description,
                    properties = excluded.properties,
                    updated_at = datetime('now')
                """,
                (scope.database, scope.schema, d.label, d.color, d.description, props),
            )
        return LabelDefinition(database=scope.database, schema=scope.schema, **d.model_dump())

    def delete(self, scope: Scope, label: str) -> bool:
        with self._conn() as c:
            cur = c.execute(
                "DELETE FROM label_definitions WHERE database = ? AND schema = ? AND label = ?",
                (scope.database, scope.schema, label),
            )
        return cur.rowcount > 0
