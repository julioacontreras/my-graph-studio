import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


class PropertyType(str, Enum):
    STRING = "String"
    INTEGER = "Integer"
    FLOAT = "Float"
    BOOLEAN = "Boolean"
    DATE = "Date"


class PropertyDefinition(BaseModel):
    name: str = Field(min_length=1)
    type: PropertyType
    required: bool = False
    unique: bool = False
    indexed: bool = False

    @property
    def needs_index(self) -> bool:
        return self.unique or self.indexed


class LabelDefinitionIn(BaseModel):
    label: str = Field(min_length=1)
    color: str = "#006cfc"
    description: str = ""
    properties: list[PropertyDefinition] = Field(default_factory=list)

    @field_validator("color")
    @classmethod
    def _color(cls, v: str) -> str:
        if not _HEX.match(v):
            raise ValueError("color must be #rrggbb")
        return v.lower()

    @field_validator("properties")
    @classmethod
    def _unique_names(cls, v: list[PropertyDefinition]) -> list[PropertyDefinition]:
        names = [p.name for p in v]
        if len(names) != len(set(names)):
            raise ValueError("property names must be unique")
        return v


class LabelDefinition(LabelDefinitionIn):
    database: str
    schema_: str = Field(alias="schema", serialization_alias="schema")

    model_config = {"populate_by_name": True}


class LabelDefinitionOut(LabelDefinition):
    count: int = 0


class Violation(BaseModel):
    node_id: int | None
    label: str
    property: str
    rule: str  # required | unique | type
    message: str
