from mygraph_studio.db.session import Scope
from mygraph_studio.models.labels import LabelDefinitionIn
from mygraph_studio.store.label_store import LabelStore


def test_crud(tmp_path):
    s = LabelStore(tmp_path / "s.db")
    scope = Scope()
    s.save(scope, LabelDefinitionIn(label="Person", color="#8B2CF5", properties=[{"name": "n", "type": "String"}]))
    got = s.get(scope, "Person")
    assert got.color == "#8b2cf5" and got.properties[0].name == "n"
    assert s.get(Scope(schema="other"), "Person") is None
    assert [d.label for d in s.all(scope)] == ["Person"]
    assert s.delete(scope, "Person") and s.all(scope) == []
