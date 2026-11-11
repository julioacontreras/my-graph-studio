"""Definiciones de etiqueta: CRUD, índices, comprobación de datos y detección."""

from collections import Counter, defaultdict
from typing import Any

from mygraph import AlreadyExistsError, Client, QueryError
from mygraph._ops import quote

from ..db.errors import StudioNotFoundError
from ..db.session import Scope
from ..models.labels import (
    LabelDefinition,
    LabelDefinitionIn,
    LabelDefinitionOut,
    PropertyDefinition,
    PropertyType,
    Violation,
)
from ..store.label_store import LabelStore
from .validation import check_properties, type_matches

PAGE = 1000

# Colores derivados de la marca primero; el resto contrasta sobre #0b1020.
PALETTE = ["#006cfc", "#8b2cf5", "#4d9bff", "#22d3ee", "#4ade80", "#fbbf24", "#f472b6", "#fb923c"]


def create_index(db: Client, label: str, prop: str) -> None:
    db.run(f"CREATE INDEX IF NOT EXISTS FOR (n:{quote(label)}) ON (n.{quote(prop)})")


def drop_index(db: Client, label: str, prop: str) -> None:
    try:
        db.run(f"DROP INDEX ON :{quote(label)}({quote(prop)})")
    except QueryError as e:
        if e.code != "NotFound":
            raise


def list_definitions(db: Client, store: LabelStore, scope: Scope) -> list[LabelDefinitionOut]:
    return [LabelDefinitionOut(**d.model_dump(by_alias=True), count=db.count_nodes(d.label)) for d in store.all(scope)]


def create_definition(db: Client, store: LabelStore, scope: Scope, d: LabelDefinitionIn) -> LabelDefinition:
    if store.exists(scope, d.label):
        raise AlreadyExistsError("AlreadyExists", f"label {d.label} already has a definition")
    for p in d.properties:
        if p.needs_index:
            create_index(db, d.label, p.name)
    return store.save(scope, d)


def update_definition(db: Client, store: LabelStore, scope: Scope, label: str, d: LabelDefinitionIn) -> LabelDefinition:
    if not store.exists(scope, label):
        raise StudioNotFoundError(f"label {label} has no definition")
    d = d.model_copy(update={"label": label})  # renombrar una etiqueta no es editar su definición
    for p in d.properties:
        if p.needs_index:
            create_index(db, label, p.name)
    return store.save(scope, d)


def delete_definition(db: Client, store: LabelStore, scope: Scope, label: str, drop_indexes: bool) -> None:
    d = store.get(scope, label)
    if d is None:
        raise StudioNotFoundError(f"label {label} has no definition")
    if drop_indexes:
        for p in d.properties:
            if p.needs_index:
                drop_index(db, label, p.name)
    store.delete(scope, label)


def iter_nodes(db: Client, label: str | None = None):
    pattern = f"(n:{quote(label)})" if label else "(n)"
    skip = 0
    while True:
        page = db.run(f"MATCH {pattern} RETURN n ORDER BY id(n) SKIP {skip} LIMIT {PAGE}").values(0)
        yield from page
        if len(page) < PAGE:
            return
        skip += PAGE


def violations(db: Client, store: LabelStore, scope: Scope, label: str) -> list[Violation]:
    d = store.get(scope, label)
    if d is None:
        raise StudioNotFoundError(f"label {label} has no definition")
    defs = {label: d}
    unique_props = [p.name for p in d.properties if p.unique]
    seen: dict[str, dict[Any, list[int]]] = {p: defaultdict(list) for p in unique_props}
    out: list[Violation] = []
    for node in iter_nodes(db, label):
        out += check_properties(defs, [label], node.properties, node.id)
        for p in unique_props:
            v = node.properties.get(p)
            if v is not None and not isinstance(v, (list, dict)):
                seen[p][v].append(node.id)
    for p, values in seen.items():
        for v, ids in values.items():
            if len(ids) > 1:
                out += [
                    Violation(node_id=i, label=label, property=p, rule="unique",
                              message=f"{len(ids)} {label} nodes have {p} = {v!r}")
                    for i in ids
                ]
    return out


def _guess_type(values: list[Any]) -> PropertyType:
    for t in (PropertyType.BOOLEAN, PropertyType.INTEGER, PropertyType.FLOAT, PropertyType.DATE):
        if all(type_matches(t, v) for v in values):
            return t
    return PropertyType.STRING


def detect(db: Client, store: LabelStore, scope: Scope, sample: int) -> list[dict[str, Any]]:
    """Propone definiciones a partir de una muestra de nodos."""
    totals: Counter[str] = Counter()
    values: dict[str, dict[str, list[Any]]] = defaultdict(lambda: defaultdict(list))
    for node in db.run(f"MATCH (n) RETURN n LIMIT {int(sample)}").values(0):
        for label in node.labels:
            totals[label] += 1
            for k, v in node.properties.items():
                if v is not None:
                    values[label][k].append(v)
    out = []
    for i, label in enumerate(sorted(totals)):
        props = [
            PropertyDefinition(name=k, type=_guess_type(vs), required=len(vs) == totals[label])
            for k, vs in sorted(values[label].items())
        ]
        proposal = LabelDefinitionIn(label=label, color=PALETTE[i % len(PALETTE)], properties=props)
        out.append({**proposal.model_dump(), "sampled": totals[label], "exists": store.exists(scope, label)})
    return out
