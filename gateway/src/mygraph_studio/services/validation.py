"""Comprueba escrituras del Studio contra las definiciones de etiqueta.

MyGraph v0.2 no tiene constraints: `required`, `unique` y los tipos los
comprueba el gateway. Solo protegen las escrituras hechas desde el Studio.
"""

import re
from datetime import date
from typing import Any

from mygraph import Client, Transaction
from mygraph._ops import quote

from ..db.errors import StudioValidationError
from ..models.labels import LabelDefinition, PropertyType, Violation

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def type_matches(t: PropertyType, value: Any) -> bool:
    if t is PropertyType.STRING:
        return isinstance(value, str)
    if t is PropertyType.INTEGER:
        return isinstance(value, int) and not isinstance(value, bool)
    if t is PropertyType.FLOAT:
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if t is PropertyType.BOOLEAN:
        return isinstance(value, bool)
    if t is PropertyType.DATE:
        if not isinstance(value, str) or not _ISO_DATE.match(value):
            return False
        try:
            date.fromisoformat(value)
        except ValueError:
            return False
        return True
    return False


def check_properties(
    definitions: dict[str, LabelDefinition],
    labels: list[str],
    properties: dict[str, Any],
    node_id: int | None = None,
) -> list[Violation]:
    """Reglas `required` y de tipo. No consulta la base de datos."""
    out: list[Violation] = []
    for label in labels:
        d = definitions.get(label)
        if d is None:
            continue
        for p in d.properties:
            value = properties.get(p.name)
            if value is None:
                if p.required:
                    out.append(Violation(node_id=node_id, label=label, property=p.name, rule="required",
                                         message=f"{label}.{p.name} is required"))
                continue
            if not type_matches(p.type, value):
                out.append(Violation(node_id=node_id, label=label, property=p.name, rule="type",
                                     message=f"{label}.{p.name} must be {p.type.value}"))
    return out


def check_unique(
    db: Client | Transaction,
    definitions: dict[str, LabelDefinition],
    labels: list[str],
    properties: dict[str, Any],
    node_id: int | None = None,
) -> list[Violation]:
    """Regla `unique`. Llamar dentro de la misma transacción que la escritura."""
    out: list[Violation] = []
    for label in labels:
        d = definitions.get(label)
        if d is None:
            continue
        for p in d.properties:
            value = properties.get(p.name)
            if not p.unique or value is None:
                continue
            q = f"MATCH (n:{quote(label)}) WHERE n.{quote(p.name)} = $v"
            params: dict[str, Any] = {"v": value}
            if node_id is not None:
                q += " AND id(n) <> $id"
                params["id"] = node_id
            if db.run(q + " RETURN count(n)", params).value():
                out.append(Violation(node_id=node_id, label=label, property=p.name, rule="unique",
                                     message=f"another {label} already has {p.name} = {value!r}"))
    return out


def raise_if_any(violations: list[Violation]) -> None:
    if violations:
        raise StudioValidationError(
            violations[0].message if len(violations) == 1 else f"{len(violations)} validation errors",
            [v.model_dump() for v in violations],
        )
