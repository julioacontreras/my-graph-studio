import time
from dataclasses import asdict

from fastapi import APIRouter

from ..db.serialize import to_json
from ..models.cypher import QueryRequest, QueryResult
from ..services.graph_extract import extract_graph
from .deps import DbDep

router = APIRouter(prefix="/cypher", tags=["cypher"])


@router.post("/execute", response_model=QueryResult, response_model_by_alias=True)
def execute(body: QueryRequest, db: DbDep) -> QueryResult:
    """Envía el texto tal cual a MyGraph. Con varias sentencias, devuelve las filas de la última."""
    start = time.perf_counter()
    r = db.run(body.query, body.params)
    elapsed = (time.perf_counter() - start) * 1000
    return QueryResult(
        columns=r.columns,
        rows=to_json(r.rows),
        stats=asdict(r.stats),
        graph=extract_graph(r.rows),
        database=r.database,
        schema_=r.schema,
        elapsed_ms=round(elapsed, 2),
    )
