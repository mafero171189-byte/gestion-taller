// POST /api/delete  { id }  o  { ids: [..] }  -> borra licencias del historial (tabla licencias).
// Protegido por usuario y contraseña (functions/_middleware.js), igual que /api/issue.
// OJO: esto limpia el historial. La licencia ya entregada sigue siendo válida en la app
// hasta que venza, porque la app solo verifica la firma del token.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }

  const raw = Array.isArray(body.ids) ? body.ids : [body.id];
  const ids = raw.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  if (!ids.length) return json({ error: "Falta el id de la licencia." }, 400);

  const stmts = ids.map((id) => env.DB.prepare("DELETE FROM licencias WHERE id = ?").bind(id));
  await env.DB.batch(stmts);
  return json({ ok: true, borradas: ids.length });
}
