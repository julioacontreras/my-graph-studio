"""Import de un script Cypher (el de export u otro escrito a mano).

El script se parte en sentencias por `;` (sin cortar dentro de strings,
identificadores con backticks ni comentarios) y se ejecutan una a una, así cada
sentencia es su propia escritura y no se bloquea la base de datos. Si una falla
se devuelve lo ya ejecutado.

Las definiciones de etiqueta del Studio van en comentarios al final del export
(`// {...}` tras la cabecera `// Definiciones de etiqueta del Studio`); se
guardan solo si todas las sentencias se ejecutan bien.
"""

import json
from dataclasses import dataclass, field

from mygraph import Client, MyGraphError, QueryError
from pydantic import ValidationError

from ..db.session import Scope
from ..models.labels import LabelDefinitionIn
from ..models.transfer import ImportResult
from ..store.label_store import LabelStore
from .export import SID
from .importer import Mode
from .labels import drop_index

DEFINITIONS_HEADER = "// Definiciones de etiqueta del Studio"


@dataclass
class Statement:
    text: str
    line: int  # 1-based, línea del script donde empieza


@dataclass
class ParsedScript:
    statements: list[Statement] = field(default_factory=list)
    definitions: list[LabelDefinitionIn] = field(default_factory=list)


def split_statements(script: str) -> list[Statement]:
    """Parte en sentencias por `;`. Quita los comentarios `//` y `/* */`."""
    out: list[Statement] = []
    buf: list[str] = []
    start_line = None
    line = 1
    i, n = 0, len(script)

    def flush() -> None:
        nonlocal buf, start_line
        text = "".join(buf).strip()
        if text:
            out.append(Statement(text, start_line or line))
        buf, start_line = [], None

    while i < n:
        c = script[i]
        nxt = script[i + 1] if i + 1 < n else ""
        if c == "/" and nxt == "/":
            j = script.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and nxt == "*":
            j = script.find("*/", i + 2)
            end = n if j < 0 else j + 2
            line += script.count("\n", i, end)
            buf.append(" ")
            i = end
            continue
        if c == ";":
            flush()
            i += 1
            continue
        if c in "'\"`":
            j = i + 1
            while j < n:
                if script[j] == "\\" and c != "`":
                    j += 2
                    continue
                if script[j] == c:
                    if c == "`" and j + 1 < n and script[j + 1] == "`":  # `` dentro de backticks
                        j += 2
                        continue
                    break
                j += 1
            end = min(j + 1, n)
            if start_line is None:
                start_line = line
            buf.append(script[i:end])
            line += script.count("\n", i, end)
            i = end
            continue
        if c == "\n":
            line += 1
        elif start_line is None and not c.isspace():
            start_line = line
        buf.append(c)
        i += 1
    flush()
    return out


def label_definitions(script: str) -> list[LabelDefinitionIn]:
    lines = script.splitlines()
    try:
        start = next(i for i, x in enumerate(lines) if x.strip().startswith(DEFINITIONS_HEADER))
    except StopIteration:
        return []
    defs = []
    for raw in lines[start + 1:]:
        s = raw.strip()
        if not s.startswith("//"):
            continue
        body = s[2:].strip()
        if not body.startswith("{"):
            continue
        try:
            defs.append(LabelDefinitionIn.model_validate(json.loads(body)))
        except (json.JSONDecodeError, ValidationError):
            continue
    return defs


def parse(script: str) -> ParsedScript:
    return ParsedScript(split_statements(script), label_definitions(script))


def _clean_sid(db: Client) -> None:
    db.run(f"MATCH (n) WHERE n.{SID} IS NOT NULL REMOVE n.{SID}")
    for r in db.run("SHOW INDEXES").records():
        if r.get("property") == SID:
            drop_index(db, r["label"], SID)


def run_cypher_import(db: Client, store: LabelStore, scope: Scope, script: str, mode: Mode) -> ImportResult:
    parsed = parse(script)
    result = ImportResult(
        mode=mode, nodes_created=0, relationships_created=0, labels_saved=0,
        statements_total=len(parsed.statements), statements_executed=0,
    )
    uses_sid = SID in script
    failed = False
    try:
        if mode == "replace":
            db.run("MATCH (n) DETACH DELETE n")
        if uses_sid:
            # Restos de un import anterior que falló: si quedan, el script uniría mal las relaciones.
            db.run(f"MATCH (n) WHERE n.{SID} IS NOT NULL REMOVE n.{SID}")
        for st in parsed.statements:
            try:
                r = db.run(st.text)
            except QueryError as e:
                failed = True
                line = (st.line + e.line - 1) if e.line else st.line
                result.error = {
                    "code": e.code, "message": e.message, "line": line, "column": e.column,
                    "statement": result.statements_executed + 1,
                }
                break
            result.statements_executed += 1
            result.nodes_created += r.stats.nodes_created
            result.relationships_created += r.stats.relationships_created
        if not failed:
            for d in parsed.definitions:
                store.save(scope, d)
                result.labels_saved += 1
    except QueryError as e:
        failed = True
        result.error = {"code": e.code, "message": e.message, "line": e.line, "column": e.column}
    finally:
        if failed and uses_sid:
            try:
                _clean_sid(db)
            except MyGraphError:
                pass
    return result
