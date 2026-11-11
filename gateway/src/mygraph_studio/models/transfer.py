from typing import Any

from pydantic import BaseModel, Field

from .graph import Node, Relationship
from .labels import LabelDefinitionIn

FORMAT_VERSION = 1


class IndexInfo(BaseModel):
    label: str
    property: str


class GraphDump(BaseModel):
    """Formato de export/import JSON. Los valores `bytes` van en base64."""

    format: str = "mygraph-studio"
    version: int = FORMAT_VERSION
    database: str = "default"
    schema_: str = Field(default="public", alias="schema", serialization_alias="schema")
    nodes: list[Node] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)
    indexes: list[IndexInfo] = Field(default_factory=list)
    labels: list[LabelDefinitionIn] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ImportResult(BaseModel):
    mode: str
    nodes_created: int
    relationships_created: int
    labels_saved: int
    # Solo en el import Cypher.
    statements_total: int | None = None
    statements_executed: int | None = None
    error: dict[str, Any] | None = None


class CypherScript(BaseModel):
    script: str


class CypherPreview(BaseModel):
    statements: int
    definitions: list[str]
    uses_sid: bool
