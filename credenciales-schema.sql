-- Credenciales del admin (usuario y clave con hash PBKDF2). Cloudflare D1.
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
INSERT INTO config (clave, valor) VALUES ('admin_user', 'admin')
  ON CONFLICT(clave) DO NOTHING;
INSERT INTO config (clave, valor) VALUES ('admin_pass_hash', 'pbkdf2$100000$bSYl00FvZmCNEvH5wCWtaA==$N/qz+WEq1DPDVnkVU5Oxdho4iRImq3s94W9OllOv87Y=')
  ON CONFLICT(clave) DO NOTHING;
