// Protege /admin, /admin.html y /api/* con usuario y contraseña (HTTP Basic).
// Las credenciales salen de la tabla "config" de D1 (clave pbkdf2). Si la tabla
// no tiene datos, se usan los secretos ADMIN_USER / ADMIN_PASS como respaldo.
// Todo lo demás del sitio sigue público.

const PROTECTED = (p) => p === "/admin" || p === "/admin.html" || p.startsWith("/api/");

// Comparación en tiempo constante.
function safeEqual(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}

const b64decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Verifica una clave contra "pbkdf2$iter$saltB64$hashB64".
async function verifyPass(pass, stored) {
  const [alg, iterS, saltB64, hashB64] = String(stored).split("$");
  if (alg !== "pbkdf2" || !iterS || !saltB64 || !hashB64) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64decode(saltB64), iterations: parseInt(iterS, 10) }, key, 256));
  return safeEqual(btoa(String.fromCharCode(...bits)), hashB64);
}

async function loadDbCreds(env) {
  if (!env.DB) return null;
  try {
    const { results } = await env.DB.prepare(
      "SELECT clave, valor FROM config WHERE clave IN ('admin_user', 'admin_pass_hash')").all();
    const m = Object.fromEntries(results.map((r) => [r.clave, r.valor]));
    return m.admin_user && m.admin_pass_hash ? { user: m.admin_user, passHash: m.admin_pass_hash } : null;
  } catch { return null; }
}

function unauthorized() {
  return new Response("Acceso restringido.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Mi Taller Web - admin", charset="UTF-8"', "cache-control": "no-store" },
  });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!PROTECTED(url.pathname)) return next();

  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Basic ")) return unauthorized();

  let user = "", pass = "";
  try {
    const decoded = atob(auth.slice(6));
    const i = decoded.indexOf(":");
    user = decoded.slice(0, i);
    pass = decoded.slice(i + 1);
  } catch { return unauthorized(); }

  const db = await loadDbCreds(env);
  let ok;
  if (db) {
    const okUser = safeEqual(user, db.user);
    const okPass = await verifyPass(pass, db.passHash);
    ok = okUser && okPass;
  } else if (env.ADMIN_USER && env.ADMIN_PASS) {
    ok = safeEqual(user, env.ADMIN_USER) && safeEqual(pass, env.ADMIN_PASS);
  } else {
    ok = false;
  }
  if (!ok) return unauthorized();

  return next();
}
