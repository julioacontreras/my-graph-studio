from typing import Any

from pydantic import BaseModel, Field

from .graph import Graph


class QueryRequest(BaseModel):
    query: str = Field(min_length=1)
    params: dict[str, Any] = Field(default_factory=dict)


class Stats(BaseModel):
    nodes_created: int = 0
    nodes_deleted: int = 0
    relationships_created: int = 0
    relationships_deleted: int = 0
    properties_set: int = 0
    labels_added: int = 0
    labels_removed: int = 0


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    stats: Stats
    graph: Graph
    database: str
    schema_: str = Field(serialization_alias="schema")
    elapsed_ms: float
