// Protege /admin.html y /api/* con usuario y contraseña (HTTP Basic).
// Credenciales en los secretos ADMIN_USER y ADMIN_PASS de Cloudflare Pages.
// Todo lo demás del sitio sigue público.

const PROTECTED = (p) => p === "/admin" || p === "/admin.html" || p.startsWith("/api/");

// Comparación en tiempo constante para no filtrar la contraseña por tiempos de respuesta.
function safeEqual(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
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
  if (!auth.startsWith("Basic ") || !env.ADMIN_USER || !env.ADMIN_PASS) return unauthorized();

  let user = "", pass = "";
  try {
    const decoded = atob(auth.slice(6));
    const i = decoded.indexOf(":");
    user = decoded.slice(0, i);
    pass = decoded.slice(i + 1);
  } catch { return unauthorized(); }

  // Se evalúan ambas para que el tiempo no revele cuál falló.
  const okUser = safeEqual(user, env.ADMIN_USER);
  const okPass = safeEqual(pass, env.ADMIN_PASS);
  if (!(okUser && okPass)) return unauthorized();

  return next();
}
