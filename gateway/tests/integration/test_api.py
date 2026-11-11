"""Rutas contra un mygraph-server real, en una base de datos temporal."""

PERSON = {
    "label": "Person",
    "color": "#006cfc",
    "properties": [
        {"name": "name", "type": "String", "required": True, "unique": True},
        {"name": "age", "type": "Integer"},
    ],
}


def test_cypher_returns_graph(client):
    r = client.post("/api/v1/cypher/execute", json={
        "query": "CREATE (a:Person {name: 'A'})-[:KNOWS]->(b:Person {name: 'B'}); "
                 "MATCH (a)-[r]->(b) RETURN a, r, b"
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["columns"] == ["a", "r", "b"]
    assert len(body["graph"]["nodes"]) == 2 and len(body["graph"]["relationships"]) == 1
    assert body["database"] == client.params["database"] and body["schema"] == "public"


def test_syntax_error_is_forwarded(client):
    r = client.post("/api/v1/cypher/execute", json={"query": "MATCH (n RETURN n"})
    assert r.status_code == 400
    assert r.json()["code"] == "Syntax" and "line" in r.json()


def test_label_rules_on_writes(client):
    assert client.post("/api/v1/labels", json=PERSON).status_code == 201
    assert any(i["label"] == "Person" for i in client.get("/api/v1/indexes").json())

    ok = client.post("/api/v1/nodes", json={"labels": ["Person"], "properties": {"name": "Ana", "age": 3}})
    assert ok.status_code == 201, ok.text
    dup = client.post("/api/v1/nodes", json={"labels": ["Person"], "properties": {"name": "Ana"}})
    assert dup.status_code == 422 and dup.json()["details"][0]["rule"] == "unique"
    bad = client.post("/api/v1/nodes", json={"labels": ["Person"], "properties": {"age": "x"}})
    assert {d["rule"] for d in bad.json()["details"]} == {"required", "type"}

    node_id = ok.json()["id"]
    upd = client.patch(f"/api/v1/nodes/{node_id}", json={"properties": {"age": 4}, "add_labels": ["Admin"]})
    assert upd.json()["properties"]["age"] == 4 and "Admin" in upd.json()["labels"]

    client.post("/api/v1/cypher/execute", json={"query": "CREATE (:Person {name: 'Ana'})"})
    v = client.get("/api/v1/labels/Person/violations").json()
    assert {x["rule"] for x in v} == {"unique"}
    labels = client.get("/api/v1/labels").json()
    assert labels[0]["count"] == 2 and labels[0]["schema"] == "public"

    assert client.delete(f"/api/v1/nodes/{node_id}").status_code == 204
    assert client.delete(f"/api/v1/nodes/{node_id}").status_code == 404


def test_export_import_roundtrip(client):
    client.post("/api/v1/cypher/execute", json={
        "query": "CREATE (a:Person {name: 'A'})-[:KNOWS {since: 2020}]->(b:Person {name: 'B'}), (:Lonely)"
    })
    dump = client.get("/api/v1/graph/export").json()
    assert len(dump["nodes"]) == 3 and len(dump["relationships"]) == 1

    r = client.post("/api/v1/graph/import", params={"mode": "replace"}, json=dump)
    assert r.status_code == 200, r.text
    assert r.json()["nodes_created"] == 3 and r.json()["relationships_created"] == 1

    rows = client.post("/api/v1/cypher/execute", json={
        "query": "MATCH (a)-[r:KNOWS]->(b) RETURN a.name, r.since, b.name, a._sid"
    }).json()["rows"]
    assert rows == [["A", 2020, "B", None]]
    assert all(i["property"] != "_sid" for i in client.get("/api/v1/indexes").json())

    script = client.get("/api/v1/graph/export", params={"format": "cypher"}).text
    assert "CREATE (a)-[x:`KNOWS`]->(b)" in script


def test_cypher_import_roundtrip(client):
    client.post("/api/v1/cypher/execute", json={
        "query": "CREATE (a:Person {name: 'A; x'})-[:KNOWS {since: 2020}]->(b:Person {name: 'B'}), (:Lonely)"
    })
    script = client.get("/api/v1/graph/export", params={"format": "cypher"}).text

    preview = client.post("/api/v1/graph/import/cypher/preview", json={"script": script}).json()
    assert preview["uses_sid"] and preview["statements"] > 0

    r = client.post("/api/v1/graph/import/cypher", params={"mode": "replace"}, json={"script": script})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["nodes_created"] == 3 and body["relationships_created"] == 1
    assert body["statements_executed"] == body["statements_total"]

    rows = client.post("/api/v1/cypher/execute", json={
        "query": "MATCH (a)-[r:KNOWS]->(b) RETURN a.name, r.since, b.name, a._sid"
    }).json()["rows"]
    assert rows == [["A; x", 2020, "B", None]]
    assert all(i["property"] != "_sid" for i in client.get("/api/v1/indexes").json())


def test_cypher_import_reports_failing_statement(client):
    script = "CREATE (:Ok);\n\nCREATE (:Bad {;\nCREATE (:Never);"
    r = client.post("/api/v1/graph/import/cypher", json={"script": script})
    assert r.status_code == 207
    body = r.json()
    assert body["statements_executed"] == 1 and body["nodes_created"] == 1
    assert body["error"]["statement"] == 2 and body["error"]["line"] == 3
