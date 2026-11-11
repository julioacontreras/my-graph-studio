# MyGraph Studio

Editor visual de [MyGraph](https://github.com/julioacontreras/my-graph): ejecuta Cypher y muestra el resultado como grafo, tabla o JSON; edita nodos y relaciones; define etiquetas con tipos y colores; exporta e importa el grafo.

Especificación completa: [docs/documentaci_n_my_graph_studio.md](docs/documentaci_n_my_graph_studio.md).

```
frontend/   React 19 + Vite + TypeScript + Tailwind v4 + D3 + CodeMirror 6
gateway/    FastAPI + mygraph-client 0.2 (HTTP/JSON ↔ protocolo v1)
```

Necesita **MyGraph 0.2** o superior.

## Desarrollo

```sh
docker compose up -d mygraph                 # mygraph-server en 127.0.0.1:6660

cd gateway
uv sync
uv run uvicorn mygraph_studio.main:app --reload    # http://localhost:8000

cd frontend
npm install
npm run dev                                  # http://localhost:5173, /api → gateway
```

## Tests

```sh
cd gateway
uv run pytest            # los de integración se saltan si no hay mygraph-server
uv run ruff check src tests

cd frontend
npm run typecheck
```

Los tests de integración crean una base de datos `studio_test_*` y la borran al terminar. Para usar otro servidor: `MYGRAPH_PORT=6661 uv run pytest`.

## Producción

```sh
docker compose up -d --build                 # Studio en http://localhost:8000
```

El gateway sirve el build del frontend. Quita la publicación del puerto 6660 en `docker-compose.yml`: MyGraph no tiene autenticación ni TLS.
