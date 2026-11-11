import pytest

from mygraph_studio.db.errors import StudioValidationError
from mygraph_studio.models.labels import LabelDefinition, PropertyType
from mygraph_studio.services.validation import check_properties, raise_if_any, type_matches

PERSON = LabelDefinition(
    database="default",
    schema="public",
    label="Person",
    properties=[
        {"name": "name", "type": "String", "required": True, "unique": True},
        {"name": "age", "type": "Integer"},
        {"name": "born", "type": "Date"},
    ],
)
DEFS = {"Person": PERSON}


@pytest.mark.parametrize(
    ("t", "value", "ok"),
    [
        (PropertyType.INTEGER, 3, True),
        (PropertyType.INTEGER, True, False),
        (PropertyType.FLOAT, 3, True),
        (PropertyType.BOOLEAN, 0, False),
        (PropertyType.DATE, "2023-01-15", True),
        (PropertyType.DATE, "2023-02-30", False),
        (PropertyType.DATE, "20230115", False),
        (PropertyType.STRING, 1, False),
    ],
)
def test_type_matches(t, value, ok):
    assert type_matches(t, value) is ok


def test_required_and_type():
    v = check_properties(DEFS, ["Person"], {"age": "old"})
    assert {(x.property, x.rule) for x in v} == {("name", "required"), ("age", "type")}


def test_labels_without_definition_are_free():
    assert check_properties(DEFS, ["Other"], {"x": 1}) == []


def test_raise_if_any():
    with pytest.raises(StudioValidationError) as e:
        raise_if_any(check_properties(DEFS, ["Person"], {}))
    assert e.value.details[0]["rule"] == "required"
