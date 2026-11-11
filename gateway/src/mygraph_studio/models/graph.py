from typing import Any

from pydantic import BaseModel, Field


class Node(BaseModel):
    id: int
    labels: list[str]
    properties: dict[str, Any]


class Relationship(BaseModel):
    id: int
    type: str
    start: int
    end: int
    properties: dict[str, Any]


class Graph(BaseModel):
    nodes: list[Node] = Field(default_factory=list)
    relationships: list[Relationship] = Field(default_factory=list)


class NodeCreate(BaseModel):
    labels: list[str] = Field(default_factory=list)
    properties: dict[str, Any] = Field(default_factory=dict)


class NodeUpdate(BaseModel):
    """`properties` se mezcla con las existentes (`SET n += $props`); un valor `null` borra la propiedad."""

    properties: dict[str, Any] | None = None
    add_labels: list[str] = Field(default_factory=list)
    remove_labels: list[str] = Field(default_factory=list)


class RelationshipCreate(BaseModel):
    start: int
    end: int
    type: str = Field(min_length=1)
    properties: dict[str, Any] = Field(default_factory=dict)


class RelationshipUpdate(BaseModel):
    properties: dict[str, Any]
