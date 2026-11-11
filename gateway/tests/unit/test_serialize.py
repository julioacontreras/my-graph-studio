from mygraph import Node, Path, Relationship

from mygraph_studio.db.serialize import to_json
from mygraph_studio.services.graph_extract import extract_graph

A = Node(1, ["Person"], {"name": "Alice", "avatar": b"\x00\x01"})
B = Node(2, ["Project"], {"name": "Graph"})
R = Relationship(10, 1, 2, "WORKS_ON", {"since": "2023-01"})


def test_node_and_bytes():
    assert to_json(A) == {"id": 1, "labels": ["Person"], "properties": {"name": "Alice", "avatar": "AAE="}}


def test_relationship_uses_start_end():
    assert to_json(R) == {"id": 10, "type": "WORKS_ON", "start": 1, "end": 2, "properties": {"since": "2023-01"}}


def test_extract_dedups_and_walks_nested_values():
    rows = [[A, R, B], [A, None, 3], [[A, B]], [{"p": Path([A, B], [R])}]]
    g = extract_graph(rows)
    assert [n["id"] for n in g["nodes"]] == [1, 2]
    assert [r["id"] for r in g["relationships"]] == [10]
