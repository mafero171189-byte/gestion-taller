// Copia todo el proyecto a /dist y minifica los <script> inline de index.html.
// El index.html original NO se modifica.
const fs = require('fs'), path = require('path');
const { minify } = require('terser');
const OUT = 'dist';
const IGNORE = new Set(['node_modules', '.git', OUT, 'build.js', 'package.json', 'package-lock.json', '.github', 'README.md', 'functions', 'licencias-schema.sql']);

function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (IGNORE.has(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copy(s, d) : fs.copyFileSync(s, d);
  }
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  copy('.', OUT);
  const file = path.join(OUT, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let out = '', last = 0, m, ok = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '', body = m[2];
    out += html.slice(last, m.index); last = m.index + m[0].length;
    const skip = /\ssrc\s*=/.test(attrs) || (/type\s*=/.test(attrs) && !/javascript|module/i.test(attrs)) || !body.trim();
    if (skip) { out += m[0]; continue; }
    const r = await minify(body, { compress: { passes: 1 }, mangle: { toplevel: false }, format: { comments: false } });
    if (!r.code) throw new Error('Fallo al minificar un script');
    out += '<script' + attrs + '>' + r.code.replace(/<\/script/gi, '<\\/script') + '</script>';
    ok++;
  }
  out += html.slice(last);
  fs.writeFileSync(file, out);
  console.log('OK: ' + ok + ' scripts minificados -> ' + OUT + '/index.html (' + html.length + ' -> ' + out.length + ' bytes)');
})().catch(e => { console.error(e); process.exit(1); });
