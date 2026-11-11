# MyGraph Studio: especificación y guía del proyecto

**MyGraph Studio** es el editor visual de [MyGraph](https://github.com/julioacontreras/my-graph), la base de datos de grafos en Rust que se consulta con Cypher. Permite ejecutar Cypher y ver el resultado como grafo o como JSON, editar nodos y relaciones, definir etiquetas con tipos y colores, y exportar o importar el grafo.

> Revisado contra MyGraph **v0.2** (protocolo v1, `mygraph-client` 0.2). Lo que no aparece en el README de MyGraph se considera no soportado.

---

## Contenido
1. [Requisitos](#requisitos)
2. [Branding](#branding)
3. [Arquitectura](#arquitectura)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Módulos](#módulos)
6. [API del gateway](#api-del-gateway)
7. [Modelos de datos](#modelos-de-datos)
8. [Consultas Cypher de ejemplo](#consultas-cypher-de-ejemplo)
9. [Límites de MyGraph v0.2 que afectan al Studio](#límites-de-mygraph-v02-que-afectan-al-studio)

---

## Requisitos

### Frontend (mismo stack que `my-graph/website`)
- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** con los tokens de `website/src/styles/tokens.css`
- **D3.js v7** (simulación de fuerzas)
- **Lucide React** (iconos)
- **CodeMirror 6** para el editor Cypher, con un tema hecho a partir de los tokens

### Gateway (obligatorio)
El navegador no puede abrir el socket TCP binario de MyGraph (puerto 6660), así que el Studio necesita un servidor intermedio:
- **Python + FastAPI** usando `mygraph-client` 0.2 (PyPI). Ya implementa el protocolo v1, decodifica nodos, relaciones y paths, y trae los helpers CRUD (`create_node`, `update_node`, `delete_node`, `create_relationship`, `delete_relationship`, …).
- Alternativa: Rust (axum) reutilizando el crate `mygraph-protocol`. Solo si se quiere un binario único; implica más código.
- **No** hay cliente JS/Node del protocolo; escribir uno no aporta nada al MVP.

### Base de datos
- **MyGraph server** (`docker compose up -d` en el repo de MyGraph, o `julioacontreras/mygraph:latest`). No Neo4j ni Memgraph.
- El puerto 6660 no debe exponerse fuera de la red del gateway: MyGraph v0.2 no tiene autenticación (`AUTH` no se comprueba) ni TLS.

---

## Branding

El Studio es un producto de la familia MyGraph y usa la misma identidad que la web.

| Elemento | Valor |
| :--- | :--- |
| Nombre | **MyGraph Studio** (MyGraph en una sola palabra) |
| Logo / favicon | `my-graph/branding/logo.png`, `website/public/favicon.svg` (marca de nodos con degradado) |
| Tagline | "Graph Database. Open Source." |
| Tema | Oscuro por defecto (`color-scheme: dark`) |
| Fondo / superficies | `bg #0b1020`, `surface #151d30`, `elevated #1e293b`, `line #29364d` |
| Texto | `fg #f8fafc`, `muted #94a3b8`, enlaces `#4d9bff` |
| Acción principal | `primary #006cfc` (hover `#1a7dff`) |
| Acento | `violet #8b2cf5`. Nunca para texto de cuerpo |
| Degradado de marca | `#006cfc → #8b2cf5`. Solo logo y uno o dos acentos por pantalla (p. ej. nodo seleccionado) |
| Estados | `danger #f87171`, `warn #fbbf24`, `ok #4ade80` |
| Tipografía | Inter (UI), Outfit (títulos), JetBrains Mono (Cypher, JSON, ids) |

Reglas:
- Importar `tokens.css` desde la web (o copiarlo y mantenerlo igual); no definir colores nuevos para la UI.
- Paleta de etiquetas: empezar por colores derivados de la marca (azul primario, violeta, azul enlace) y completar con tonos que contrasten sobre `#0b1020`. Comprobar contraste del texto de la etiqueta sobre el color del nodo.
- Acciones destructivas (borrar nodo, importar sobrescribiendo) en `danger`, con confirmación.
- Tono de los textos como en la web y el README: frases cortas, sin emojis, sin prometer funciones que MyGraph no tiene.

---

## Arquitectura

```
Navegador (React)  ──HTTP/JSON──▶  Gateway (FastAPI + mygraph-client)  ──TCP protocolo v1──▶  mygraph-server :6660
                                          │
                                          └── SQLite (studio.db): definiciones de etiquetas, colores
```

- El gateway abre una conexión por petición (o un pool pequeño). Cada conexión es una sesión nueva en `default/public`, así que cada petición envía la base de datos y el schema activos y el gateway ejecuta `USE DATABASE` / `USE SCHEMA` antes de la consulta.
- MyGraph serializa todas las sentencias y una transacción abierta bloquea al resto de conexiones. El gateway nunca deja transacciones abiertas entre peticiones.
- Las definiciones de etiquetas (tipos, `required`, `unique`, color, descripción) **no existen en MyGraph**: las guarda el Studio.

---

## Estructura del proyecto

Un solo repositorio con dos aplicaciones: `frontend/` (React) y `gateway/` (Python).

```
my-graph-studio/
├── frontend/              # React 19 + Vite + TypeScript
├── gateway/               # FastAPI + mygraph-client
├── docs/
├── docker-compose.yml     # mygraph-server + studio (gateway que sirve el build)
├── .dockerignore
└── README.md
```

### Frontend

Organizado por módulo (`features/`). Cada módulo tiene sus componentes y su lógica; lo compartido va en `components/`, `api/`, `types/` y `lib/`.

```
frontend/
├── index.html
├── package.json
├── vite.config.ts            # proxy /api → http://localhost:8000 en desarrollo
├── tsconfig.json
├── public/
│   └── favicon.svg           # copia de my-graph/website/public
└── src/
    ├── main.tsx
    ├── App.tsx               # AppShell + módulo activo
    ├── styles/
    │   ├── tokens.css        # copia exacta de my-graph/website/src/styles/tokens.css
    │   └── index.css         # @import "tailwindcss" + tokens + fuentes
    ├── api/                  # única capa que habla con el gateway
    │   ├── client.ts         # fetch, añade ?database=&schema=, convierte errores en ApiError
    │   ├── cypher.ts
    │   ├── databases.ts
    │   ├── nodes.ts
    │   ├── relationships.ts
    │   ├── labels.ts
    │   └── transfer.ts       # import / export
    ├── types/                # mismo contrato que "Modelos de datos"
    │   ├── graph.ts          # Node, Relationship, Path, QueryResult, Stats
    │   ├── labels.ts         # LabelDefinition, PropertyDefinition, PropertyType, Violation
    │   ├── transfer.ts       # GraphDump, ImportResult
    │   └── errors.ts         # ApiError {code, message, line?, column?}
    ├── state/                # React Context
    │   ├── SessionContext.tsx   # database / schema activos
    │   └── LabelsContext.tsx    # definiciones cargadas, color por etiqueta
    ├── components/           # UI compartida, solo tokens
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── Sidebar.tsx           # navegación entre módulos
    │   │   └── ScopeSelector.tsx     # selector de base de datos y schema
    │   ├── Button.tsx
    │   ├── Dialog.tsx
    │   ├── ConfirmDialog.tsx         # acciones destructivas en danger
    │   ├── Tabs.tsx
    │   ├── Select.tsx
    │   └── ErrorBox.tsx              # muestra {code, message, line, column, details}
    ├── features/
    │   ├── cypher/                   # Módulo 1: Cypher & Graph
    │   │   ├── CypherPage.tsx
    │   │   ├── CypherEditor.tsx      # CodeMirror 6, marca line/column del error
    │   │   ├── cypherTheme.ts        # tema a partir de los tokens
    │   │   ├── ResultTabs.tsx        # Grafo / Tabla / JSON
    │   │   ├── TableView.tsx
    │   │   ├── JsonView.tsx
    │   │   └── StatusBar.tsx         # stats, tiempo, database/schema
    │   ├── graph/
    │   │   ├── GraphView.tsx         # render SVG, zoom y arrastre
    │   │   ├── useForceSimulation.ts # d3-force; conserva posiciones al expandir
    │   │   ├── extractGraph.ts       # combinar grafos; start/end → source/target para D3
    │   │   ├── Inspector.tsx         # propiedades, etiquetas, borrar
    │   │   ├── PropertyEditor.tsx    # clave/valor; los valores se leen como JSON
    │   │   └── useExpandNode.ts      # GET /nodes/:id/neighbors
    │   ├── labels/                   # Módulo 2: Label Designer
    │   │   ├── LabelDesignerPage.tsx
    │   │   ├── LabelList.tsx
    │   │   ├── LabelForm.tsx         # propiedades con tipo y required/unique/indexed
    │   │   ├── ViolationsPanel.tsx   # "Comprobar datos"
    │   │   ├── DetectFromData.tsx
    │   │   └── palette.ts            # paleta de etiquetas derivada de la marca
    │   └── transfer/                 # Módulo 3: Import / Export
    │       ├── TransferPage.tsx
    │       ├── ExportPanel.tsx
    │       ├── ImportPanel.tsx       # resumen + confirmación, append/replace
    │       └── validateImport.ts
    └── lib/
        ├── contrast.ts               # contraste texto/color de nodo
        └── format.ts
```

Reglas:
- Los componentes no llaman a `fetch`; usan las funciones de `api/`.
- `types/` sigue el contrato del gateway sin cambiarlo. `source`/`target` solo existen dentro de `features/graph/`.
- Sin router ni librería de estado en el MVP: tres módulos en el `AppShell` y dos contextos. Los módulos se ocultan en lugar de desmontarse, para conservar el resultado de la consulta.
- La extracción de nodos y relaciones de las celdas la hace el gateway (`graph` en la respuesta); el frontend solo combina grafos al expandir un nodo.
- Colores solo desde `tokens.css` y `palette.ts`.

### Gateway (Python)

Paquete `mygraph_studio` con tres capas: `api/` (HTTP) → `services/` (reglas del Studio) → `db/` y `store/` (MyGraph y almacén local). Las rutas no usan `mygraph-client` directamente.

```
gateway/
├── pyproject.toml            # fastapi, uvicorn, mygraph-client>=0.2,<0.3, pydantic-settings
│                             # dev: pytest, httpx, ruff (uv)
├── uv.lock
├── Dockerfile                # build del frontend + gateway en una imagen
├── .env.example              # MYGRAPH_HOST, MYGRAPH_PORT, STUDIO_DB_PATH, CORS_ORIGINS, STATIC_DIR
├── src/
│   └── mygraph_studio/
│       ├── __init__.py
│       ├── main.py           # create_app(): routers, handlers de error, CORS opcional, estáticos
│       ├── config.py         # Settings (pydantic-settings)
│       ├── api/              # routers FastAPI, prefijo /api/v1
│       │   ├── deps.py       # Scope(database, schema) desde query params; sesión por petición
│       │   ├── cypher.py     # POST /cypher/execute
│       │   ├── databases.py  # GET /databases, /databases/{db}/schemas
│       │   ├── nodes.py
│       │   ├── relationships.py
│       │   ├── labels.py
│       │   ├── indexes.py
│       │   └── transfer.py   # /graph/export, /graph/import
│       ├── models/           # Pydantic: peticiones y respuestas
│       │   ├── graph.py      # Node, Relationship, Graph y cuerpos de escritura
│       │   ├── cypher.py     # QueryRequest, QueryResult, Stats
│       │   ├── labels.py     # LabelDefinition, PropertyDefinition
│       │   ├── transfer.py   # formato de export/import
│       │   └── errors.py     # ErrorResponse {code, message, line?, column?}
│       ├── services/
│       │   ├── graph_extract.py  # filas → {nodes, relationships} deduplicados
│       │   ├── nodes.py          # escrituras de nodos y relaciones con validación, vecinos
│       │   ├── validation.py     # tipos, Date ISO-8601, required, unique (BEGIN … COMMIT)
│       │   ├── labels.py         # CRUD de definiciones, índices, violations, detectar desde datos
│       │   ├── export.py         # JSON paginado y script Cypher con _sid
│       │   ├── importer.py       # validación, lotes, append/replace
│       │   └── cypher_import.py  # import de scripts Cypher, sentencia a sentencia
│       ├── db/               # todo lo que toca mygraph-client
│       │   ├── session.py    # abre conexión, USE DATABASE / USE SCHEMA, cierra; nunca deja transacciones abiertas
│       │   ├── serialize.py  # objetos del cliente → JSON; bytes → base64
│       │   └── errors.py     # error de MyGraph → HTTP; sin conexión → 503; StudioValidationError → 422
│       └── store/            # definiciones de etiqueta (solo Studio)
│           ├── label_store.py  # SQLite (sqlite3 de la stdlib), clave (database, schema, label)
│           └── schema.sql
└── tests/
    ├── conftest.py           # base de datos temporal studio_test_* en un mygraph-server real; TestClient
    ├── unit/                 # serialize, graph_extract, validation, export, label_store
    └── integration/          # rutas contra un mygraph-server real
```

Reglas:
- Una conexión a MyGraph por petición, creada en `api/deps.py` y cerrada al terminar (dependencia con `yield`).
- `mygraph-client` es síncrono (sockets de la stdlib), así que las rutas se declaran con `def`, no `async def`: FastAPI las ejecuta en su pool de hilos y no bloquean el bucle de eventos.
- El almacén de etiquetas es SQLite (no `studio.json`): soporta escrituras concurrentes del gateway sin reescribir un fichero entero.
- Los errores de MyGraph se reenvían sin cambiar `code` ni `message`; `services/validation.py` produce `code: "Validation"`.

### Despliegue

- **Desarrollo**: `docker compose up -d mygraph`, `uvicorn mygraph_studio.main:app --reload` en `gateway/` y `npm run dev` en `frontend/`. Vite redirige `/api` al gateway, así que no hace falta CORS.
- **Producción**: `docker compose up -d --build`. El `Dockerfile` del gateway compila el frontend y el gateway lo sirve desde `STATIC_DIR` (cualquier ruta que no sea `/api` devuelve `index.html`). Un solo contenedor para el Studio más `mygraph-server`; en producción el puerto 6660 no se publica fuera de la red de Docker.
- Requiere **MyGraph 0.2**: la 0.1 no tiene `CREATE INDEX` ni `SHOW INDEXES`.

---

## Módulos

### 1. Cypher & Graph
- Editor Cypher; el gateway envía el texto tal cual a MyGraph. **No hace falta un parser en el frontend**: MyGraph analiza la consulta y devuelve errores `Syntax` con `line`/`column`, que el editor marca en la posición.
- Scripts con varias sentencias separadas por `;` (MyGraph devuelve las filas de la última y suma los `stats`).
- Vista grafo: se recorren todas las celdas del resultado y se extraen nodos, relaciones y paths (deduplicados por id). Columnas escalares se muestran en la vista tabla.
- Vistas: **Grafo**, **Tabla** y **JSON** (respuesta cruda).
- Barra de estado: `stats` (`nodes_created`, `properties_set`, …), tiempo y `database/schema` actuales.
- Inspector lateral: editar propiedades (`SET n += $props`), añadir/quitar etiquetas, borrar nodo (`DETACH DELETE`) o relación.
- Selector de base de datos y schema (`SHOW DATABASES`, `SHOW SCHEMAS`).
- Aviso cuando el resultado supera N nodos (p. ej. 2.000) y `LIMIT` por defecto en la consulta inicial.

### 2. Label Designer (antes "Visual Schema Architect")
En MyGraph, *schema* es un espacio de nombres dentro de una base de datos (`CREATE SCHEMA`, `USE SCHEMA`). Para no confundirlo, este módulo trabaja con **definiciones de etiqueta**.
- Por etiqueta: color, descripción y propiedades con tipo (`String`, `Integer`, `Float`, `Boolean`, `Date`) y marcas `required` / `unique` / `indexed`.
- `Date` no es un tipo de MyGraph: se guarda como string ISO-8601 (`2023-01-15`) y el Studio lo valida.
- `required` y `unique` **los comprueba el gateway**, no la base de datos (MyGraph v0.2 no tiene constraints). Solo protegen las escrituras hechas desde el Studio; los datos escritos por CLI o Python pueden incumplirlas. El Studio ofrece un botón "Comprobar datos" que lista los nodos que no cumplen.
- La comprobación de `unique` se hace dentro de `BEGIN … COMMIT` (comprobar con `MATCH`, crear si no hay filas), lo que es seguro porque MyGraph serializa las transacciones.
- `unique` e `indexed` crean el índice en MyGraph: `CREATE INDEX IF NOT EXISTS FOR (n:Label) ON (n.prop)`. Sin índice, cada comprobación recorre todos los nodos de la etiqueta.
- "Detectar desde datos": propone definiciones a partir de `MATCH (n) RETURN labels(n), keys(n)` sobre una muestra.

### 3. Import / Export
MyGraph v0.2 no tiene import/export; el Studio lo implementa con Cypher.
- **Export JSON**: nodos y relaciones paginados (`SKIP`/`LIMIT`), más `SHOW INDEXES` y las definiciones de etiqueta. Valores `bytes` en base64.
- **Export Cypher**: los ids los asigna el motor y no se pueden fijar, y no existe `MERGE`. El script:
  1. Crea un índice temporal sobre una propiedad `_sid` (id original).
  2. `UNWIND $nodes AS n CREATE (x:Label) SET x = n.props, x._sid = n.id` por grupo de etiquetas.
  3. `UNWIND $rels AS r MATCH (a {_sid: r.start}), (b {_sid: r.end}) CREATE (a)-[:TYPE]->(b)` usando la etiqueta para que el índice se aplique.
  4. `MATCH (n) REMOVE n._sid` y `DROP INDEX`.
  Como la CLI no acepta parámetros, el script exportado lleva los valores literales.
- **Import JSON**: valida la estructura, muestra un resumen (nodos, relaciones, etiquetas nuevas) y pide confirmación. Modo **añadir** o **sobrescribir** (`MATCH (n) DETACH DELETE n` antes). Se importa en lotes, no en una única transacción, para no bloquear la base de datos; si un lote falla se informa de lo ya importado.
- **Import Cypher** (`.cypher`, `.cql`, `.cyp`): el gateway parte el script en sentencias por `;` (sin cortar dentro de strings, backticks ni comentarios) y muestra cuántas hay antes de confirmar. Mismos modos **añadir** / **sobrescribir**. Las sentencias se ejecutan una a una; si una falla se informa del número de sentencia, la línea del script y lo ya ejecutado. Las definiciones de etiqueta que el export deja en comentarios (`// {...}`) se guardan si el script termina bien. Si el script usa `_sid` y falla, el gateway borra la propiedad y sus índices temporales.

---

## API del gateway

Todas las rutas aceptan `?database=…&schema=…` (por defecto `default` / `public`). Los ids son enteros.

### Consultas y grafo

| Método | Ruta | Implementación en MyGraph |
| :--- | :--- | :--- |
| `POST` | `/api/v1/cypher/execute` | `QUERY` con `{query, params}`; devuelve `columns`, `rows`, `stats`, `graph: {nodes, relationships}` extraído |
| `GET` | `/api/v1/databases` | `SHOW DATABASES` |
| `GET` | `/api/v1/databases/:db/schemas` | `USE DATABASE …; SHOW SCHEMAS` |
| `POST` | `/api/v1/nodes` | `create_node(labels, props)` + validación de la definición de etiqueta |
| `PATCH` | `/api/v1/nodes/:id` | `update_node(id, props, add_labels, remove_labels)` |
| `DELETE` | `/api/v1/nodes/:id` | `delete_node(id, detach=True)` |
| `GET` | `/api/v1/nodes/:id/neighbors` | `MATCH (n)-[r]-(m) WHERE id(n) = $id RETURN r, m LIMIT $limit` (expandir nodo) |
| `POST` | `/api/v1/relationships` | `create_relationship(start, end, type, props)` |
| `PATCH` | `/api/v1/relationships/:id` | `update_relationship(id, props)` |
| `DELETE` | `/api/v1/relationships/:id` | `delete_relationship(id)` |

### Definiciones de etiqueta (almacén del Studio)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/labels` | Definiciones de la base de datos/schema activos, con el número de nodos (`count`) |
| `POST` | `/api/v1/labels` | Crea una definición; crea los índices de `unique`/`indexed` |
| `PUT` | `/api/v1/labels/:label` | Edita propiedades, color o descripción |
| `DELETE` | `/api/v1/labels/:label` | Borra la definición. **No borra nodos**; opcionalmente `DROP INDEX` |
| `GET` | `/api/v1/labels/:label/violations` | Nodos que incumplen `required`/`unique`/tipo |
| `GET` | `/api/v1/labels/detect?sample=500` | Propone definiciones a partir de una muestra de nodos; no guarda nada |
| `GET` | `/api/v1/indexes` | `SHOW INDEXES` |

### Import / export

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/graph/export?format=json\|cypher` | Descarga generada como se describe arriba |
| `POST` | `/api/v1/graph/import?mode=append\|replace` | Importa un JSON con el formato de export. 200 si todo entra; 207 con `error` y los contadores de lo ya importado si un lote falla |
| `POST` | `/api/v1/graph/import/cypher/preview` | `{script}` → `{statements, definitions, uses_sid}`; no ejecuta nada |
| `POST` | `/api/v1/graph/import/cypher?mode=append\|replace` | `{script}`; ejecuta sentencia a sentencia. 200 si todo entra; 207 con `error.statement`, `error.line` y `statements_executed` si una falla |

### Errores
El gateway reenvía el error de MyGraph sin cambiarlo: `{code, message, line?, column?}` (`Syntax`, `Semantic`, `Type`, `Execution`, `NotFound`, `AlreadyExists`, `Unsupported`, `Transaction`, …). Los errores de validación del Studio usan `code: "Validation"` (HTTP 422) y la lista `details`. Estado HTTP: `NotFound` 404, `AlreadyExists` y `Transaction` 409, resto 400. Si MyGraph no responde: HTTP 503 con `code: "Unavailable"`.

---

## Modelos de datos

Mismo formato JSON que `mygraph query --json`.

### Nodo
```json
{
  "id": 0,
  "labels": ["Person"],
  "properties": { "name": "Alice Smith", "age": 29, "email": "alice@example.com" }
}
```
- Un nodo puede tener **varias etiquetas**. El color se toma de la primera que tenga definición; el inspector muestra todas.

### Relación
```json
{
  "id": 0,
  "type": "WORKS_ON",
  "start": 0,
  "end": 3,
  "properties": { "since": "2023-01" }
}
```
- D3 necesita `source`/`target`: el frontend los añade a partir de `start`/`end` (no se cambia el contrato).

### Path
```json
{ "nodes": [ /* nodos */ ], "relationships": [ /* relaciones */ ] }
```

### Definición de etiqueta (solo Studio)
```json
{
  "label": "Person",
  "database": "default",
  "schema": "public",
  "color": "#006cfc",
  "description": "Represents individual users",
  "properties": [
    { "name": "name", "type": "String", "required": true, "unique": true, "indexed": true },
    { "name": "age", "type": "Integer", "required": false, "unique": false, "indexed": false }
  ]
}
```
La clave es `(database, schema, label)`; no hace falta un id aparte.

---

## Consultas Cypher de ejemplo

```cypher
// Todo el grafo, incluidos los nodos sin relaciones (consulta inicial)
MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 500

// Por etiqueta
MATCH (n:Person) RETURN n LIMIT 100

// Por tipo de relación
MATCH (p:Person)-[r:WORKS_ON]->(pr:Project) RETURN p, r, pr

// Vecinos a 1..3 saltos
MATCH p = (a:Person {name: 'Alice Smith'})-[*1..3]-(x) RETURN p

// Camino más corto
MATCH (a:Person {name: 'Alice Smith'}), (b:Person {name: 'Bob'}), p = shortestPath((a)-[*..10]-(b)) RETURN p
```

`MATCH (n)-[r]->(m) RETURN n, r, m` no devuelve los nodos aislados, por eso no se usa como consulta inicial.

---

## Límites de MyGraph v0.2 que afectan al Studio

| Límite | Consecuencia en el Studio |
| :--- | :--- |
| Sin `MERGE` | Upserts y export/import con `MATCH` + `CREATE` y la propiedad temporal `_sid` |
| Sin constraints | `required`/`unique` los valida el gateway; botón "Comprobar datos" |
| Sin tipo fecha | `Date` como string ISO-8601 |
| Índices solo de igualdad, no automáticos | El Studio crea índices para `unique`/`indexed` y avisa si se busca por una propiedad sin índice |
| Sin `UNION`, `CALL`, regex `=~` | El editor muestra el error `Unsupported`/`Syntax` de MyGraph |
| Sin autenticación ni TLS | El Studio necesita su propio login si se publica; 6660 solo en red interna |
| Escrituras serializadas, transacciones bloquean todo | Lotes cortos, nada de transacciones abiertas entre peticiones |
| Sin import/export nativo | Implementado en el gateway |
