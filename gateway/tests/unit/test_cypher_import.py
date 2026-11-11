from mygraph_studio.models.transfer import GraphDump
from mygraph_studio.services.cypher_import import parse, split_statements
from mygraph_studio.services.export import to_cypher


def test_split_respects_strings_and_comments():
    script = (
        "// cabecera; no es sentencia\n"
        "CREATE (:A {s: 'a;b', t: \"c\\\";d\"});\n"
        "/* bloque ; */ CREATE (:`B;C`)\n"
        ";\n"
        "MATCH (n) RETURN n  // sin ; final\n"
    )
    st = split_statements(script)
    assert [s.text for s in st] == [
        "CREATE (:A {s: 'a;b', t: \"c\\\";d\"})",
        "CREATE (:`B;C`)",
        "MATCH (n) RETURN n",
    ]
    assert [s.line for s in st] == [2, 3, 5]


def test_parse_export_script():
    d = GraphDump(
        nodes=[{"id": 0, "labels": ["Person"], "properties": {"bio": "x; y\n'z'"}}],
        labels=[{"label": "Person", "color": "#ff0000", "properties": []}],
    )
    p = parse(to_cypher(d))
    assert [x.label for x in p.definitions] == ["Person"]
    assert all(not s.text.startswith("//") for s in p.statements)
    assert any("x; y\\n\\'z\\'" in s.text for s in p.statements)
    # índice temporal, nodos, limpiar _sid, drop índice
    assert len(p.statements) == 4
