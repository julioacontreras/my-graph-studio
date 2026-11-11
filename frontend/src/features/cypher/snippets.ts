/**
 * Consultas de ejemplo que el usuario puede cargar en el editor con un clic.
 * Todas probadas contra MyGraph 0.2. Los valores de ejemplo ("Ana", "mi_base")
 * están pensados para que el usuario los cambie antes de ejecutar.
 */

export interface Snippet {
  label: string;
  query: string;
}

export interface SnippetGroup {
  title: string;
  snippets: Snippet[];
}

/** Incluye los nodos sin relaciones; `MATCH (n)-[r]->(m)` no los devolvería. */
export const SHOW_NODES = "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 500";

export const SNIPPET_GROUPS: SnippetGroup[] = [
  {
    title: "Bases de datos",
    snippets: [
      { label: "Crear base de datos", query: "CREATE DATABASE mi_base" },
      { label: "Ver bases de datos", query: "SHOW DATABASES" },
      { label: "Borrar base de datos", query: "DROP DATABASE mi_base" },
      { label: "Ver schemas", query: "SHOW SCHEMAS" },
      { label: "Ver índices", query: "SHOW INDEXES" },
    ],
  },
  {
    title: "Consultar",
    snippets: [
      { label: "Ver nodos", query: SHOW_NODES },
      {
        label: "Nodo por nombre",
        query:
          'MATCH (n) WHERE toLower(n.name) CONTAINS toLower("Ana")\nOPTIONAL MATCH (n)-[r]-(m)\nRETURN n, r, m LIMIT 100',
      },
      { label: "Nodos por etiqueta", query: "MATCH (n:Persona) RETURN n LIMIT 25" },
      {
        label: "Contar por etiqueta",
        query: "MATCH (n) RETURN labels(n) AS etiqueta, count(n) AS total ORDER BY total DESC",
      },
      { label: "Tipos de relación", query: "MATCH ()-[r]->() RETURN type(r) AS tipo, count(r) AS total" },
    ],
  },
  {
    title: "Editar",
    snippets: [
      { label: "Crear nodo", query: 'CREATE (n:Persona {name: "Ana"}) RETURN n' },
      {
        label: "Crear relación",
        query:
          'MATCH (a:Persona {name: "Ana"}), (b:Persona {name: "Luis"})\nCREATE (a)-[r:CONOCE]->(b)\nRETURN a, r, b',
      },
      { label: "Borrar nodo", query: 'MATCH (n {name: "Ana"}) DETACH DELETE n' },
    ],
  },
];

const IDENT = "`?([A-Za-z_][A-Za-z0-9_]*)`?";
const CREATE_DB = new RegExp(`\\bCREATE\\s+DATABASE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT}`, "gi");
const DROP_DB = new RegExp(`\\bDROP\\s+DATABASE\\s+(?:IF\\s+EXISTS\\s+)?${IDENT}`, "gi");
const SCOPE_DDL = /\b(CREATE|DROP)\s+(DATABASE|SCHEMA)\b/i;

/** Cambios de bases de datos o schemas que hace una consulta, para refrescar el selector. */
export function scopeChanges(query: string): { changed: boolean; created: string[]; dropped: string[] } {
  return {
    changed: SCOPE_DDL.test(query),
    created: [...query.matchAll(CREATE_DB)].map((m) => m[1]),
    dropped: [...query.matchAll(DROP_DB)].map((m) => m[1]),
  };
}
