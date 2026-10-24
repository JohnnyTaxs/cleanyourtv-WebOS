'use strict';
// The owner's own wallpapers: pictures in <dir> (a folder on the TV) that the launcher can show behind the home screen instead of the theme's.
// API (loopback only, read-only): GET /api/wallpaper/list -> {files: [...]}, GET /api/wallpaper/img/<file>. Which picture is shown is a setting of
// the launcher (config.wallpaper), written through /api/config. File names are lower-case letters, digits and '-', so a name can never be a path.
const fs = require('fs'), path = require('path');

const NAME = /^[a-z0-9][a-z0-9-]{0,40}\.(jpg|png|webp)$/, MAX_BYTES = 3 * 1024 * 1024, MAX_FILES = 200;
const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// sfondo-2 before sfondo-10
const natural = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

function create(ctx) {
  const files = () => { try { return fs.readdirSync(ctx.dir).filter(f => NAME.test(f)).sort(natural).slice(0, MAX_FILES); } catch (_) { return []; } };

  function handle(req, res, u) {
    const json = o => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    const none = () => { res.writeHead(404); res.end(); };
    if (req.method !== 'GET') return none();
    if (u === '/api/wallpaper/list') return json({ files: files() });
    let name = null;
    try { name = decodeURIComponent(u.slice('/api/wallpaper/img/'.length)); } catch (_) {}
    if (!u.startsWith('/api/wallpaper/img/') || !name || !NAME.test(name)) return none();
    try {
      const f = path.join(ctx.dir, name);
      if (fs.statSync(f).size > MAX_BYTES) return none();
      res.writeHead(200, { 'content-type': TYPES[name.split('.').pop()], 'cache-control': 'max-age=3600' });
      res.end(fs.readFileSync(f));
    } catch (_) { none(); }
  }

  return { handle, files };
}

module.exports = { create, NAME };
