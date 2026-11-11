"""Export del grafo a JSON o a un script Cypher.

MyGraph asigna los ids y no tiene MERGE. El script recrea los nodos con una
propiedad temporal `_sid` (id original), une las relaciones por `_sid` con un
índice temporal y al final borra `_sid` y el índice.
"""

import json
import math
import re
from collections import defaultdict
from collections.abc import Iterable
from typing import Any

from mygraph import Client
from mygraph._ops import quote

from ..db.serialize import node_to_json, rel_to_json, to_json
from ..db.session import Scope
from ..models.transfer import GraphDump, IndexInfo
from ..store.label_store import LabelStore
from .labels import PAGE, iter_nodes

SID = "_sid"
BATCH = 200
_PLAIN_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def iter_relationships(db: Client):
    skip = 0
    while True:
        page = db.run(f"MATCH ()-[r]->() RETURN r ORDER BY id(r) SKIP {skip} LIMIT {PAGE}").values(0)
        yield from page
        if len(page) < PAGE:
            return
        skip += PAGE


def user_indexes(db: Client) -> list[IndexInfo]:
    return [
        IndexInfo(label=r["label"], property=r["property"])
        for r in db.run("SHOW INDEXES").records()
        if r.get("property") != SID
    ]


def dump(db: Client, store: LabelStore, scope: Scope) -> GraphDump:
    return GraphDump(
        database=scope.database,
        schema=scope.schema,
        nodes=[node_to_json(n) for n in iter_nodes(db)],
        relationships=[rel_to_json(r) for r in iter_relationships(db)],
        indexes=user_indexes(db),
        labels=[d.model_dump(include={"label", "color", "description", "properties"}) for d in store.all(scope)],
    )


# ---------------------------------------------------------------- Cypher

def literal(v: Any) -> str:
    """Valor → literal Cypher. La CLI no acepta parámetros, así que el script lleva los valores."""
    v = to_json(v)
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(v) if math.isfinite(v) else "null"
    if isinstance(v, str):
        escaped = (v.replace("\\", "\\\\").replace("'", "\\'")
                    .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t"))
        return f"'{escaped}'"
    if isinstance(v, list):
        return "[" + ", ".join(literal(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ", ".join(f"{key(k)}: {literal(x)}" for k, x in v.items()) + "}"
    raise TypeError(f"cannot write {type(v).__name__} as Cypher")


def key(k: str) -> str:
    return k if _PLAIN_KEY.match(k) else quote(k)


def labels_of(labels: Iterable[str]) -> str:
    return "".join(":" + quote(x) for x in labels)


def chunks(items: list, size: int = BATCH):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def first_label(labels_by_id: dict[int, list[str]], node_id: int) -> str:
    labels = labels_by_id.get(node_id) or []
    return labels_of(labels[:1])


def to_cypher(d: GraphDump) -> str:
    out = [
        "// MyGraph Studio export",
        f"// database: {d.database}  schema: {d.schema_}",
        f"// nodes: {len(d.nodes)}  relationships: {len(d.relationships)}",
        "",
    ]
    by_labels: dict[tuple[str, ...], list] = defaultdict(list)
    labels_by_id: dict[int, list[str]] = {}
    for n in d.nodes:
        by_labels[tuple(n.labels)].append(n)
        labels_by_id[n.id] = n.labels
    sid_labels = sorted({labels[0] for labels in by_labels if labels})

    for label in sid_labels:
        out.append(f"CREATE INDEX IF NOT EXISTS FOR (n:{quote(label)}) ON (n.{SID});")
    for labels, nodes in by_labels.items():
        for batch in chunks(nodes):
            items = literal([{"id": n.id, "props": n.properties} for n in batch])
            out.append(f"UNWIND {items} AS n CREATE (x{labels_of(labels)}) SET x = n.props, x.{SID} = n.id;")

    by_shape: dict[tuple[str, str, str], list] = defaultdict(list)
    for r in d.relationships:
        by_shape[(r.type, first_label(labels_by_id, r.start), first_label(labels_by_id, r.end))].append(r)
    for (rtype, a, b), rels in by_shape.items():
        for batch in chunks(rels):
            items = literal([{"start": r.start, "end": r.end, "props": r.properties} for r in batch])
            out.append(
                f"UNWIND {items} AS r MATCH (a{a} {{{SID}: r.start}}), (b{b} {{{SID}: r.end}}) "
                f"CREATE (a)-[x:{quote(rtype)}]->(b) SET x = r.props;"
            )

    out.append(f"MATCH (n) WHERE n.{SID} IS NOT NULL REMOVE n.{SID};")
    for label in sid_labels:
        out.append(f"DROP INDEX ON :{quote(label)}({SID});")
    for ix in d.indexes:
        out.append(f"CREATE INDEX IF NOT EXISTS FOR (n:{quote(ix.label)}) ON (n.{quote(ix.property)});")
    if d.labels:
        out += ["", "// Definiciones de etiqueta del Studio (no existen en MyGraph):"]
        out += [f"// {json.dumps(x.model_dump(mode='json'), ensure_ascii=False)}" for x in d.labels]
    return "\n".join(out) + "\n"
