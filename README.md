<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="branding/banner-dark.png">
    <img alt="MyGraph Studio — Visual editor. Open Source." src="branding/banner.png" width="520">
  </picture>
</p>

<p align="center">
  Editor visual de <a href="https://github.com/julioacontreras/my-graph">MyGraph</a>: ejecuta Cypher y explora el resultado como grafo, tabla o JSON.
</p>

<p align="center">
  <a href="https://github.com/julioacontreras/my-graph"><img alt="MyGraph 0.2+" src="https://img.shields.io/badge/MyGraph-0.2%2B-006cfc"></a>
  <a href="gateway/pyproject.toml"><img alt="Python 3.11+" src="https://img.shields.io/badge/python-3.11%2B-3776ab"></a>
  <a href="frontend/package.json"><img alt="React 19" src="https://img.shields.io/badge/react-19-61dafb"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

<p align="center">
  <a href="#instalación"><strong>Instalación</strong></a> ·
  <a href="#uso"><strong>Uso</strong></a> ·
  <a href="#configuración"><strong>Configuración</strong></a> ·
  <a href="#desarrollo"><strong>Desarrollo</strong></a> ·
  <a href="docs/documentaci_n_my_graph_studio.md"><strong>Especificación</strong></a>
</p>

---

MyGraph Studio sirve para trabajar con una base de datos MyGraph desde el
navegador. Puedes ejecutar Cypher, ver el resultado como grafo, editar nodos y
relaciones, definir etiquetas con tipos y colores, y exportar o importar el
grafo.

El navegador no puede abrir el socket TCP de MyGraph (puerto 6660), así que el
Studio tiene dos partes: un frontend en React y un **gateway** en FastAPI. El
gateway traduce HTTP/JSON al [protocolo v1](https://github.com/julioacontreras/my-graph/blob/main/PROTOCOL.md)
con [`mygraph-client`](https://pypi.org/project/mygraph-client/).

```
navegador ──HTTP/JSON──▶ gateway (FastAPI, :8000) ──protocolo v1──▶ mygraph-server (:6660)
```

> [!IMPORTANT]
> Necesita **MyGraph 0.2** o superior. MyGraph v0.2 no tiene autenticación ni
> TLS: no publiques el puerto 6660 fuera de la red del gateway. El Studio
> tampoco tiene login todavía.

## Contenido

- [Funcionalidades](#funcionalidades)
- [Instalación](#instalación)
- [Uso](#uso)
- [Configuración](#configuración)
- [Desarrollo](#desarrollo)
- [Arquitectura](#arquitectura)
- [Límites](#límites)
- [Licencia](#licencia)

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Cypher & Graph** | Editor Cypher (CodeMirror) con errores marcados en línea y columna. Scripts con varias sentencias separadas por `;`. Vistas **Grafo** (D3), **Tabla** y **JSON**. Inspector para editar propiedades y etiquetas, borrar nodos y relaciones, y expandir vecinos. Selector de base de datos y schema. |
| **Label Designer** | Define por etiqueta un color, una descripción y propiedades con tipo (`String`, `Integer`, `Float`, `Boolean`, `Date`) y las marcas `required`, `unique` e `indexed`. Crea los índices en MyGraph, lista los nodos que no cumplen y propone definiciones a partir de los datos. |
| **Import / Export** | Exporta a JSON o a un script Cypher. Importa JSON o `.cypher`/`.cql`/`.cyp` en modo **añadir** o **sobrescribir**, por lotes y con un resumen previo. |

## Instalación

### Docker Compose (recomendado)

Desde la raíz del repositorio:

```bash
docker compose up -d --build     # MyGraph + Studio en http://localhost:8000
docker compose ps                # comprueba que los dos servicios están en marcha
docker compose logs -f studio    # sigue los logs del Studio
docker compose down              # para todo; los datos se quedan en los volúmenes
docker compose down -v           # para todo y BORRA los datos
```

El servicio `studio` construye el frontend y lo sirve desde el gateway, en un
solo contenedor. Los datos se guardan en dos volúmenes:

| Volumen | Contenido |
|---|---|
| `mygraph-data` | El grafo (WAL y snapshots de MyGraph) |
| `studio-data` | `studio.db`: definiciones de etiqueta del Studio (SQLite) |

> [!WARNING]
> En producción, borra el bloque `ports` del servicio `mygraph` en
> [`docker-compose.yml`](docker-compose.yml). Solo hace falta para el gateway
> en local.

### Contra un MyGraph que ya tienes

Arranca solo el Studio y apunta `MYGRAPH_HOST` / `MYGRAPH_PORT` a tu servidor
(ver [Configuración](#configuración)):

```bash
docker build -f gateway/Dockerfile -t mygraph-studio .
docker run -d -p 8000:8000 -v studio-data:/data \
  -e MYGRAPH_HOST=mi-servidor -e MYGRAPH_PORT=6660 mygraph-studio
```

## Uso

Abre http://localhost:8000.

1. Elige la base de datos y el schema arriba (por defecto `default` / `public`).
2. Escribe una consulta en **Cypher** y ejecútala:

   ```cypher
   CREATE (a:Person {name: 'Ada'})-[:KNOWS]->(b:Person {name: 'Alan'});
   MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 100
   ```

3. Haz clic en un nodo para editarlo en el inspector o para expandir sus vecinos.
4. En **Labels**, define `Person` con `name: String, required, unique`. Desde
   ahí el Studio valida las escrituras que hace y crea el índice.
5. En **Import / Export**, descarga el grafo como JSON o Cypher.

La API del gateway está documentada en http://localhost:8000/docs (OpenAPI) y
en la [especificación](docs/documentaci_n_my_graph_studio.md#api-del-gateway).
Para comprobar que responde: `curl http://localhost:8000/api/health`.

## Configuración

El gateway lee variables de entorno o un fichero `gateway/.env` (copia
[`gateway/.env.example`](gateway/.env.example)).

| Variable | Por defecto | Descripción |
|---|---|---|
| `MYGRAPH_HOST` | `localhost` | Host de `mygraph-server` |
| `MYGRAPH_PORT` | `6660` | Puerto de `mygraph-server` |
| `MYGRAPH_TIMEOUT` | `30` | Timeout de las peticiones a MyGraph, en segundos |
| `STUDIO_DB_PATH` | `studio.db` | SQLite con las definiciones de etiqueta (`/data/studio.db` en Docker) |
| `CORS_ORIGINS` | `[]` | Lista JSON de orígenes permitidos. Vacía en desarrollo: Vite hace de proxy |
| `STATIC_DIR` | — | Carpeta con el build del frontend. Si existe, el gateway la sirve |

En el frontend, `GATEWAY_URL` cambia el destino del proxy `/api` de Vite (por
defecto `http://localhost:8000`).

## Desarrollo

Requisitos: Docker, [uv](https://docs.astral.sh/uv/) y Node 22.

```bash
docker compose up -d mygraph                        # mygraph-server en 127.0.0.1:6660

cd gateway
uv sync
uv run uvicorn mygraph_studio.main:app --reload     # http://localhost:8000

cd frontend
npm install
npm run dev                                         # http://localhost:5173, /api → gateway
```

### Tests y lint

```bash
cd gateway
uv run pytest                    # los de integración se saltan si no hay mygraph-server
uv run ruff check src tests

cd frontend
npm run typecheck
npm run build                    # typecheck + build de producción en dist/
```

Los tests de integración crean una base de datos `studio_test_*` y la borran al
terminar. Para usar otro servidor: `MYGRAPH_PORT=6661 uv run pytest`.

## Arquitectura

```
frontend/   React 19 + Vite + TypeScript + Tailwind v4 + D3 + CodeMirror 6
  src/api/        clientes HTTP del gateway
  src/features/   cypher, graph, labels, transfer
  src/state/      sesión (base de datos/schema) y definiciones de etiqueta

gateway/    FastAPI + mygraph-client 0.2
  src/mygraph_studio/api/        rutas /api/v1/*
  src/mygraph_studio/services/   validación, import/export, extracción del grafo
  src/mygraph_studio/store/      almacén SQLite de definiciones de etiqueta
  src/mygraph_studio/db/         sesión con MyGraph, serialización y errores
```

- El gateway envía el Cypher tal cual a MyGraph. El frontend no tiene parser.
  Los errores de MyGraph (`{code, message, line?, column?}`) llegan sin cambios.
- Las definiciones de etiqueta viven en el Studio, no en MyGraph. `required` y
  `unique` los comprueba el gateway, así que solo protegen las escrituras
  hechas desde el Studio.
- Import/export está implementado en el gateway con Cypher, porque MyGraph v0.2
  no lo trae.

Los detalles están en la [especificación](docs/documentaci_n_my_graph_studio.md).

## Límites

Vienen de MyGraph v0.2:

| Límite | Consecuencia en el Studio |
|---|---|
| Sin `MERGE` | Export/import con `MATCH` + `CREATE` y una propiedad temporal `_sid` |
| Sin constraints | `required`/`unique` los valida el gateway; botón "Comprobar datos" |
| Sin tipo fecha | `Date` se guarda como string ISO-8601 |
| Sin `UNION`, `CALL`, regex `=~` | El editor muestra el error de MyGraph |
| Sin autenticación ni TLS | El puerto 6660 solo en red interna; el Studio no tiene login todavía |
| Escrituras serializadas | Import por lotes cortos, sin transacciones abiertas entre peticiones |

## Licencia

[MIT](LICENSE) © 2026 Julio Contreras
