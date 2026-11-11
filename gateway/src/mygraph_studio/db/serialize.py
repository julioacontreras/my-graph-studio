"""Valores de mygraph-client → JSON (mismo formato que `mygraph query --json`)."""

import base64
from typing import Any

from mygraph import Node, Path, Relationship


def node_to_json(n: Node) -> dict[str, Any]:
    return {"id": n.id, "labels": list(n.labels), "properties": to_json(n.properties)}


def rel_to_json(r: Relationship) -> dict[str, Any]:
    return {
        "id": r.id,
        "type": r.type,
        "start": r.start_node,
        "end": r.end_node,
        "properties": to_json(r.properties),
    }


def to_json(value: Any) -> Any:
    if isinstance(value, Node):
        return node_to_json(value)
    if isinstance(value, Relationship):
        return rel_to_json(value)
    if isinstance(value, Path):
        return {
            "nodes": [node_to_json(n) for n in value.nodes],
            "relationships": [rel_to_json(r) for r in value.relationships],
        }
    if isinstance(value, (bytes, bytearray, memoryview)):
        return base64.b64encode(bytes(value)).decode("ascii")
    if isinstance(value, dict):
        return {k: to_json(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json(v) for v in value]
    return value
