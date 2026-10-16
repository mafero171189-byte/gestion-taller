// POST /api/issue  -> emite una licencia firmada para un ID de equipo.
// Protegido por usuario y contraseña (functions/_middleware.js). La clave privada
// viene del secreto PRIVATE_KEY (PKCS8 en base64). Nunca se envía al navegador.

const PRODUCT = "VKM1";
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const b64url = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// "7d", "2w", "3m", "1y" o un número suelto (= días). Devuelve la fecha de vencimiento.
function addDuration(from, raw) {
  const s = String(raw || "").trim().toLowerCase();
  const m = /^(\d+)([dwmy]?)$/.exec(s);
  if (!m) throw new Error("Duración inválida (ej. 7d, 2w, 3m, 1y).");
  const n = parseInt(m[1], 10);
  if (n <= 0 || n > 100) throw new Error("Duración fuera de rango.");
  const d = new Date(from * 1000);
  switch (m[2] || "d") {
    case "d": d.setUTCDate(d.getUTCDate() + n); break;
    case "w": d.setUTCDate(d.getUTCDate() + n * 7); break;
    case "m": d.setUTCMonth(d.getUTCMonth() + n); break;
    case "y": d.setUTCFullYear(d.getUTCFullYear() + n); break;
  }
  return Math.floor(d.getTime() / 1000);
}

export async function onRequestPost({ request, env }) {
  // La autenticación la hace functions/_middleware.js antes de llegar acá.
  const who = env.ADMIN_USER;

  let body;
  try { body = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }

  const fp = String(body.fingerprint || "").replace(/[-\s]/g, "").toUpperCase();
  if (!/^[A-Z2-9]{20,40}$/.test(fp)) return json({ error: "ID de equipo inválido." }, 400);

  const name = String(body.name || "Cliente").trim().slice(0, 80) || "Cliente";
  const dur = String(body.duration || "").trim();

  let iss, exp;
  try {
    iss = Math.floor(Date.now() / 1000);
    exp = addDuration(iss, dur);
  } catch (e) { return json({ error: e.message }, 400); }

  // Mismo orden de campos que LicenseGen: la app verifica la firma sobre estos bytes exactos.
  const payloadBytes = new TextEncoder().encode(
    JSON.stringify({ p: PRODUCT, fp, name, ed: "full", iss, exp })
  );

  let key;
  try {
    const der = Uint8Array.from(atob(env.PRIVATE_KEY.trim()), (c) => c.charCodeAt(0));
    key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  } catch {
    return json({ error: "Falta o es inválida la clave privada (secreto PRIVATE_KEY)." }, 500);
  }

  // WebCrypto devuelve r||s (IEEE P1363), que es lo que espera .NET al verificar.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, payloadBytes));
  const token = b64url(payloadBytes) + "." + b64url(sig);

  await env.DB.prepare(
    "INSERT INTO licencias (cliente, fingerprint, duracion, emitida, vence, token, emitida_por) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(name, fp, dur, iss, exp, token, who).run();

  return json({ token, cliente: name, fingerprint: fp, emitida: iss, vence: exp });
}
