from typing import Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from ..models.transfer import CypherPreview, CypherScript, GraphDump, ImportResult
from ..services import cypher_import, export, importer
from .deps import DbDep, ScopeDep, StoreDep

router = APIRouter(prefix="/graph", tags=["import-export"])


@router.get("/export")
def export_graph(
    db: DbDep, store: StoreDep, scope: ScopeDep, format: Literal["json", "cypher"] = "json"
) -> Response:
    d = export.dump(db, store, scope)
    name = f"mygraph-{scope.database}-{scope.schema}"
    if format == "cypher":
        return PlainTextResponse(
            export.to_cypher(d),
            headers={"Content-Disposition": f'attachment; filename="{name}.cypher"'},
        )
    return JSONResponse(
        d.model_dump(mode="json", by_alias=True),
        headers={"Content-Disposition": f'attachment; filename="{name}.json"'},
    )


@router.post("/import", response_model=ImportResult)
def import_graph(
    body: GraphDump, db: DbDep, store: StoreDep, scope: ScopeDep, mode: Literal["append", "replace"] = "append"
) -> JSONResponse:
    """207 si un lote falló: `error` indica el fallo y los contadores lo ya importado."""
    result = importer.run_import(db, store, scope, body, mode)
    return JSONResponse(result.model_dump(), status_code=207 if result.error else 200)


@router.post("/import/cypher/preview", response_model=CypherPreview)
def preview_cypher(body: CypherScript) -> CypherPreview:
    """Cuenta las sentencias y las definiciones de etiqueta sin ejecutar nada."""
    p = cypher_import.parse(body.script)
    return CypherPreview(
        statements=len(p.statements),
        definitions=[d.label for d in p.definitions],
        uses_sid=export.SID in body.script,
    )


@router.post("/import/cypher", response_model=ImportResult)
def import_cypher(
    body: CypherScript, db: DbDep, store: StoreDep, scope: ScopeDep, mode: Literal["append", "replace"] = "append"
) -> JSONResponse:
    """Ejecuta el script sentencia a sentencia. 207 si una falla: `error.statement` y `error.line` la sitúan."""
    result = cypher_import.run_cypher_import(db, store, scope, body.script, mode)
    return JSONResponse(result.model_dump(), status_code=207 if result.error else 200)
