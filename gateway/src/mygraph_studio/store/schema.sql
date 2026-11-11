CREATE TABLE IF NOT EXISTS label_definitions (
    database    TEXT NOT NULL,
    schema      TEXT NOT NULL,
    label       TEXT NOT NULL,
    color       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    properties  TEXT NOT NULL DEFAULT '[]',  -- JSON: lista de PropertyDefinition
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (database, schema, label)
);
