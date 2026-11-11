from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .api import cypher, databases, indexes, labels, nodes, relationships, transfer
from .config import Settings, get_settings
from .db.errors import register_error_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="MyGraph Studio gateway", version=__version__)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    register_error_handlers(app)

    for module in (cypher, databases, nodes, relationships, labels, indexes, transfer):
        app.include_router(module.router, prefix="/api/v1")

    @app.get("/api/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    if settings.static_dir and Path(settings.static_dir).is_dir():
        mount_frontend(app, Path(settings.static_dir))
    return app


def mount_frontend(app: FastAPI, dist: Path) -> None:
    """Sirve el build de Vite; cualquier ruta que no sea /api devuelve index.html."""
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")
    index = dist / "index.html"

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404)
        file = (dist / path).resolve()
        if path and file.is_file() and file.is_relative_to(dist.resolve()):
            return FileResponse(file)
        return FileResponse(index)


app = create_app()
