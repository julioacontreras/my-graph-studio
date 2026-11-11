from mygraph_studio.models.transfer import GraphDump
from mygraph_studio.services.export import literal, to_cypher


def test_literals():
    assert literal("it's\n") == "'it\\'s\\n'"
    assert literal({"a": 1, "my key": [True, None, 1.5]}) == "{a: 1, `my key`: [true, null, 1.5]}"
    assert literal(b"\x00") == "'AA=='"


def test_cypher_script_steps():
    d = GraphDump(
        nodes=[
            {"id": 0, "labels": ["Person"], "properties": {"name": "Alice"}},
            {"id": 3, "labels": ["Project"], "properties": {}},
        ],
        relationships=[{"id": 0, "type": "WORKS_ON", "start": 0, "end": 3, "properties": {}}],
        indexes=[{"label": "Person", "property": "name"}],
    )
    script = to_cypher(d)
    assert "CREATE INDEX IF NOT EXISTS FOR (n:`Person`) ON (n._sid);" in script
    assert "UNWIND [{id: 0, props: {name: 'Alice'}}] AS n CREATE (x:`Person`)" in script
    assert "MATCH (a:`Person` {_sid: r.start}), (b:`Project` {_sid: r.end}) CREATE (a)-[x:`WORKS_ON`]->(b)" in script
    assert script.index("REMOVE n._sid") < script.index("DROP INDEX ON :`Person`(_sid)")
    assert "ON (n.`name`)" in script
