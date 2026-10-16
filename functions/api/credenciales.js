// POST /api/credenciales  -> cambia el usuario y la clave del admin.
// Ya pasó por functions/_middleware.js, así que quien llega acá conoce la clave actual.
// Guarda la nueva clave como hash PBKDF2 en la tabla "config" de D1.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const ITER = 100000; // máximo permitido por Workers
const b64 = (u) => btoa(String.fromCharCode(...u));

async function hashPass(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256));
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }

  const user = String(body.user || "").trim();
  const pass = String(body.pass || "");

  if (!/^[A-Za-z0-9._-]{3,40}$/.test(user))
    return json({ error: "El usuario tiene que tener entre 3 y 40 letras, números, punto, guion o guion bajo." }, 400);
  if (pass.length < 12 || pass.length > 200)
    return json({ error: "La clave tiene que tener al menos 12 caracteres." }, 400);
  if (pass.trim() === "")
    return json({ error: "La clave no puede ser solo espacios." }, 400);

  if (!env.DB) return json({ error: "Base de datos no disponible." }, 500);

  const hash = await hashPass(pass);
  const stmts = [
    env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('admin_user', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(user),
    env.DB.prepare("INSERT INTO config (clave, valor) VALUES ('admin_pass_hash', ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor").bind(hash),
  ];
  await env.DB.batch(stmts);

  return json({ ok: true, user });
}
