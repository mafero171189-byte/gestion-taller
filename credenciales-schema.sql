-- Credenciales del admin (usuario y clave con hash PBKDF2). Cloudflare D1.
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT INTO config (clave, valor) VALUES ('admin_user', 'admin')
  ON CONFLICT(clave) DO NOTHING;
INSERT INTO config (clave, valor) VALUES ('admin_pass_hash', 'pbkdf2$210000$Ticcmw377VNOeSGm4mhuGg==$TAyj9eaTVQ4xvawq2ZDt+4I7EjCRfBenRijFl84HPgM=')
  ON CONFLICT(clave) DO NOTHING;
