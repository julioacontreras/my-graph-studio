"""Escrituras de nodos y relaciones con las reglas del Studio."""

from typing import Any

from mygraph import Client

from ..db.errors import StudioNotFoundError
from ..db.serialize import node_to_json, rel_to_json
from ..db.session import Scope
from ..models.graph import NodeCreate, NodeUpdate, RelationshipCreate, RelationshipUpdate
from ..store.label_store import LabelStore
from .graph_extract import extract_graph
from .validation import check_properties, check_unique, raise_if_any


def _has_unique(defs, labels: list[str]) -> bool:
    return any(p.unique for label in labels if (d := defs.get(label)) for p in d.properties)


def create_node(db: Client, store: LabelStore, scope: Scope, body: NodeCreate) -> dict[str, Any]:
    defs = store.by_label(scope, body.labels)
    raise_if_any(check_properties(defs, body.labels, body.properties))
    if not _has_unique(defs, body.labels):
        return node_to_json(db.create_node(body.labels, body.properties))
    # MyGraph serializa las transacciones: comprobar y crear dentro de BEGIN … COMMIT es seguro.
    with db.transaction() as tx:
        raise_if_any(check_unique(tx, defs, body.labels, body.properties))
        node = tx.create_node(body.labels, body.properties)
    return node_to_json(node)


def update_node(db: Client, store: LabelStore, scope: Scope, node_id: int, body: NodeUpdate) -> dict[str, Any]:
    current = db.get_node(node_id)
    if current is None:
        raise StudioNotFoundError(f"node {node_id} does not exist")

    labels = [x for x in current.labels if x not in body.remove_labels]
    labels += [x for x in body.add_labels if x not in labels]
    props = dict(current.properties)
    for k, v in (body.properties or {}).items():
        if v is None:
            props.pop(k, None)
        else:
            props[k] = v

    defs = store.by_label(scope, labels)
    raise_if_any(check_properties(defs, labels, props, node_id))

    def apply(target) -> Any:
        return target.update_node(
            node_id,
            body.properties,
            add_labels=body.add_labels or None,
            remove_labels=body.remove_labels or None,
        )

    if _has_unique(defs, labels):
        with db.transaction() as tx:
            raise_if_any(check_unique(tx, defs, labels, props, node_id))
            node = apply(tx)
    else:
        node = apply(db)
    if node is None:
        raise StudioNotFoundError(f"node {node_id} does not exist")
    return node_to_json(node)


def delete_node(db: Client, node_id: int) -> None:
    if not db.delete_node(node_id, detach=True):
        raise StudioNotFoundError(f"node {node_id} does not exist")


def neighbors(db: Client, node_id: int, limit: int) -> dict[str, Any]:
    q = f"MATCH (n) WHERE id(n) = $id OPTIONAL MATCH (n)-[r]-(m) RETURN n, r, m LIMIT {int(limit)}"
    result = db.run(q, {"id": node_id})
    if not result.rows:
        raise StudioNotFoundError(f"node {node_id} does not exist")
    return extract_graph(result.rows)


def create_relationship(db: Client, body: RelationshipCreate) -> dict[str, Any]:
    rel = db.create_relationship(body.start, body.end, body.type, body.properties)
    if rel is None:
        raise StudioNotFoundError(f"node {body.start} or {body.end} does not exist")
    return rel_to_json(rel)


def update_relationship(db: Client, rel_id: int, body: RelationshipUpdate) -> dict[str, Any]:
    rel = db.update_relationship(rel_id, body.properties)
    if rel is None:
        raise StudioNotFoundError(f"relationship {rel_id} does not exist")
    return rel_to_json(rel)


def delete_relationship(db: Client, rel_id: int) -> None:
    if not db.delete_relationship(rel_id):
        raise StudioNotFoundError(f"relationship {rel_id} does not exist")


