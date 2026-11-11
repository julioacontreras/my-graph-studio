import uuid

import mygraph
import pytest
from fastapi.testclient import TestClient

from mygraph_studio.api.deps import get_settings
from mygraph_studio.config import Settings
from mygraph_studio.main import create_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(studio_db_path=tmp_path / "studio.db")


@pytest.fixture
def test_database(settings: Settings):
    """Base de datos temporal en el mygraph-server local; se borra al terminar.

    Arrancar el servidor con `docker compose up -d mygraph`. Sin servidor, los
    tests de integración se saltan.
    """
    try:
        admin = mygraph.connect(settings.mygraph_host, settings.mygraph_port, timeout=5)
    except mygraph.ConnectionClosedError:
        pytest.skip("mygraph-server is not running")
    name = f"studio_test_{uuid.uuid4().hex[:8]}"
    admin.create_database(name)
    try:
        yield name
    finally:
        admin.drop_database(name)
        admin.close()


@pytest.fixture
def client(settings: Settings, test_database: str) -> TestClient:
    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    c = TestClient(app)
    c.params = {"database": test_database}
    return c
