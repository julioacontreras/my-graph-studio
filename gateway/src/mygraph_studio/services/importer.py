"""Import del formato JSON de export.

Se importa en lotes, no en una transacción, para no bloquear la base de datos
(MyGraph serializa las escrituras). Si un lote falla se devuelve lo ya importado.
"""

from collections import defaultdict
from typing import Literal

from mygraph import Client, MyGraphError, QueryError
from mygraph._ops import quote

from ..db.session import Scope
from ..models.transfer import GraphDump, ImportResult
from ..store.label_store import LabelStore
from .export import SID, chunks, first_label, labels_of
from .labels import create_index, drop_index

Mode = Literal["append", "replace"]


def run_import(db: Client, store: LabelStore, scope: Scope, d: GraphDump, mode: Mode) -> ImportResult:
    result = ImportResult(mode=mode, nodes_created=0, relationships_created=0, labels_saved=0)
    by_labels: dict[tuple[str, ...], list] = defaultdict(list)
    labels_by_id: dict[int, list[str]] = {}
    for n in d.nodes:
        by_labels[tuple(n.labels)].append(n)
        labels_by_id[n.id] = n.labels
    sid_labels = sorted({labels[0] for labels in by_labels if labels})

    try:
        if mode == "replace":
            db.run("MATCH (n) DETACH DELETE n")
        # Restos de un import anterior que falló.
        db.run(f"MATCH (n) WHERE n.{SID} IS NOT NULL REMOVE n.{SID}")
        for label in sid_labels:
            create_index(db, label, SID)

        for labels, nodes in by_labels.items():
            q = f"UNWIND $nodes AS n CREATE (x{labels_of(labels)}) SET x = n.props, x.{SID} = n.id"
            for batch in chunks(nodes, 500):
                r = db.run(q, {"nodes": [{"id": n.id, "props": n.properties} for n in batch]})
                result.nodes_created += r.stats.nodes_created

        by_shape: dict[tuple[str, str, str], list] = defaultdict(list)
        for rel in d.relationships:
            by_shape[(rel.type, first_label(labels_by_id, rel.start), first_label(labels_by_id, rel.end))].append(rel)
        for (rtype, a, b), rels in by_shape.items():
            q = (
                f"UNWIND $rels AS r MATCH (a{a} {{{SID}: r.start}}), (b{b} {{{SID}: r.end}}) "
                f"CREATE (a)-[x:{quote(rtype)}]->(b) SET x = r.props"
            )
            for batch in chunks(rels, 500):
                r = db.run(q, {"rels": [{"start": x.start, "end": x.end, "props": x.properties} for x in batch]})
                result.relationships_created += r.stats.relationships_created

        for ix in d.indexes:
            create_index(db, ix.label, ix.property)
        for label_def in d.labels:
            store.save(scope, label_def)
            result.labels_saved += 1
    except QueryError as e:
        result.error = {"code": e.code, "message": e.message, "line": e.line, "column": e.column}
    finally:
        try:
            db.run(f"MATCH (n) WHERE n.{SID} IS NOT NULL REMOVE n.{SID}")
            for label in sid_labels:
                drop_index(db, label, SID)
        except MyGraphError:
            pass
    return result
