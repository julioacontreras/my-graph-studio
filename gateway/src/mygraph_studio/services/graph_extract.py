"""Extrae nodos y relaciones de cualquier celda de un resultado.

Recorre listas y mapas anidados, de modo que `collect(n)`, `nodes(p)` o un
mapa con nodos dentro también aparecen en la vista grafo. Deduplica por id.
"""

from typing import Any

from mygraph import Node, Path, Relationship

from ..db.serialize import node_to_json, rel_to_json


def extract_graph(rows: list[list[Any]]) -> dict[str, list[dict[str, Any]]]:
    nodes: dict[int, Node] = {}
    rels: dict[int, Relationship] = {}

    def walk(v: Any) -> None:
        if isinstance(v, Node):
            nodes.setdefault(v.id, v)
        elif isinstance(v, Relationship):
            rels.setdefault(v.id, v)
        elif isinstance(v, Path):
            for n in v.nodes:
                nodes.setdefault(n.id, n)
            for r in v.relationships:
                rels.setdefault(r.id, r)
        elif isinstance(v, (list, tuple)):
            for x in v:
                walk(x)
        elif isinstance(v, dict):
            for x in v.values():
                walk(x)

    for row in rows:
        walk(row)

    return {
        "nodes": [node_to_json(n) for n in nodes.values()],
        "relationships": [rel_to_json(r) for r in rels.values()],
    }
