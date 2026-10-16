// GET /api/history?q=texto  -> licencias emitidas (filtra por cliente o ID de equipo).
// Protegido por usuario y contraseña (functions/_middleware.js), igual que /api/issue.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestGet({ request, env }) {
  // La autenticación la hace functions/_middleware.js antes de llegar acá.
  const q = (new URL(request.url).searchParams.get("q") || "").trim().replace(/[-\s]/g, "").toUpperCase();
  const like = `%${q}%`;
  const sql = q
    ? "SELECT id, cliente, fingerprint, duracion, emitida, vence, token FROM licencias " +
      "WHERE cliente LIKE ? OR REPLACE(fingerprint, '-', '') LIKE ? ORDER BY emitida DESC LIMIT 200"
    : "SELECT id, cliente, fingerprint, duracion, emitida, vence, token FROM licencias ORDER BY emitida DESC LIMIT 200";
  const stmt = q ? env.DB.prepare(sql).bind(like, like) : env.DB.prepare(sql);
  const { results } = await stmt.all();

  const now = Math.floor(Date.now() / 1000);
  return json(results.map((r) => ({ ...r, vigente: r.vence > now })));
}
