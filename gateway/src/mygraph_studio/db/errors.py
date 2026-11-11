"""Errores de MyGraph y del Studio → respuestas HTTP.

El `code` y el `message` de MyGraph se reenvían sin cambios.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from mygraph import ConnectionClosedError, ProtocolError, QueryError

_STATUS_BY_CODE = {
    "NotFound": 404,
    "AlreadyExists": 409,
    "Transaction": 409,
}


class StudioValidationError(Exception):
    """Una escritura no cumple una definición de etiqueta."""

    def __init__(self, message: str, details: list[dict[str, Any]] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or []


class StudioNotFoundError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def _body(code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {"code": code, "message": message, **{k: v for k, v in extra.items() if v is not None}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(QueryError)
    def _query_error(_: Request, e: QueryError) -> JSONResponse:
        status = _STATUS_BY_CODE.get(e.code, 400)
        return JSONResponse(_body(e.code, e.message, line=e.line, column=e.column), status_code=status)

    @app.exception_handler(ConnectionClosedError)
    def _unavailable(_: Request, e: ConnectionClosedError) -> JSONResponse:
        return JSONResponse(_body("Unavailable", str(e)), status_code=503)

    @app.exception_handler(ProtocolError)
    def _protocol(_: Request, e: ProtocolError) -> JSONResponse:
        return JSONResponse(_body("Protocol", str(e)), status_code=502)

    @app.exception_handler(StudioValidationError)
    def _validation(_: Request, e: StudioValidationError) -> JSONResponse:
        return JSONResponse(_body("Validation", e.message, details=e.details or None), status_code=422)

    @app.exception_handler(StudioNotFoundError)
    def _not_found(_: Request, e: StudioNotFoundError) -> JSONResponse:
        return JSONResponse(_body("NotFound", e.message), status_code=404)
