-- Historial de licencias emitidas (Cloudflare D1)
-- Ejecutar una vez: wrangler d1 execute licencias --file=licencias-schema.sql --remote
-- (o pegarlo en el panel de D1 > Console)
CREATE TABLE IF NOT EXISTS licencias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente     TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  duracion    TEXT NOT NULL,
  emitida     INTEGER NOT NULL,   -- unix segundos
  vence       INTEGER NOT NULL,   -- unix segundos
  token       TEXT NOT NULL,
  emitida_por TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licencias_fp ON licencias(fingerprint);
CREATE INDEX IF NOT EXISTS idx_licencias_cliente ON licencias(cliente);
