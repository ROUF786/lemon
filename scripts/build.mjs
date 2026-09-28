#!/usr/bin/env node
/**
 * Bagawan Brothers — site builder
 * ------------------------------------------------------------
 * Run it by double-clicking  update-lemons.bat  (or: npm run build)
 *
 *  1. Reads lemon photos from the Image folder (file name = variety name)
 *  2. Optimises them into site/assets/img/lemons/ and writes
 *     site/assets/js/varieties.js (the list the slider uses)
 *  3. Copies the fonts, makes app icons + the WhatsApp/Google preview image
 *  4. Applies settings from site/assets/js/config.js (website address, phone number)
 *     to every page, writes the lemon cards into index.html + lemons.html, copies the
 *     shared header / menu / footer from index.html to the other pages, sitemap, robots
 *
 * Optional per-variety tweaks live in  lemons.json  (tagline, colour, order, hide).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const OUT_IMG = path.join(SITE, 'assets', 'img', 'lemons');
const ICONS = path.join(SITE, 'assets', 'img', 'icons');
const FONTS = path.join(SITE, 'assets', 'fonts');
const ok = (...a) => console.log('  ✓', ...a);
const info = (...a) => console.log('   ', ...a);
const warn = (...a) => { console.log('  !', ...a); WARNINGS.push(a.join(' ')); };
const WARNINGS = [];

console.log('\n  Bagawan Brothers — updating the website\n');

/* ---------- 1. settings ---------- */
const CFG = (() => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, 'assets', 'js', 'config.js'), 'utf8'), ctx);
  return ctx.window.BB_CONFIG || {};
})();
const SITE_URL = String(CFG.SITE_URL || '').replace(/\/+$/, '');
const WA = String(CFG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
const PHONE_DISPLAY = CFG.PHONE_DISPLAY || (WA ? '+' + WA : '');
const IMAGE_DIR = path.resolve(ROOT, CFG.IMAGE_FOLDER || '../Image');
const FEATURED = String(CFG.FEATURED_VARIETY || '').trim();

/* ---------- 2. optional image tools ---------- */
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  warn('Image tools are not installed, so photos are copied as they are.',
    'Run "npm install" once (update-lemons.bat does this) for sharper, lighter images.');
}

/* ---------- 3. per-variety tweaks (lemons.json) ---------- */
let OVERRIDES = {};
const ovrFile = path.join(ROOT, 'lemons.json');
if (fs.existsSync(ovrFile)) {
  try { OVERRIDES = JSON.parse(fs.readFileSync(ovrFile, 'utf8')); }
  catch (e) { warn('lemons.json has a typing mistake and was ignored:', e.message); }
}
const overrideFor = (name) => {
  const key = Object.keys(OVERRIDES).find((k) => k.toLowerCase() === name.toLowerCase());
  return key && OVERRIDES[key] && typeof OVERRIDES[key] === 'object' ? OVERRIDES[key] : {};
};

/* Taglines and colours for varieties we already know. Anything else gets sensible defaults. */
const KNOWN = {
  kagzi: { tagline: 'Paper-thin skin. All juice.', bg: '#FFD43B', tone: 'lime', badge: 'GI-tagged Indi lime' },
  eureka: { tagline: 'The everyday classic.' },
  lisbon: { tagline: 'Juicy, sharp, reliable.' },
  meyer: { tagline: 'Sweeter, softer, fragrant.', tone: 'meyer' },
  villafranca: { tagline: 'Old-world Sicilian stock.' },
  femminello: { tagline: "Italy's favourite lemon." },
  interdonato: { tagline: 'The early-season Sicilian.' },
  ponderosa: { tagline: 'The giant lemon.' },
  verna: { tagline: "Spain's late-season gold." },
};
const DEFAULT_TAGLINE = 'Fresh, graded, farm-direct.';
// bright background colours for varieties whose photo has no plain background (no dark colours)
const PALETTE = ['#FFD43B', '#5BC0FF', '#8ED36B', '#FF9F5A', '#B794F6', '#FF8FAB', '#3CC9A6', '#F9A826'];
const TONES = {
  lemon: { rind: '#E9B80E', pith: '#FFF6D2', flesh: '#F8D443', leaf: '#2F8A3B' },
  meyer: { rind: '#EE9417', pith: '#FFF1D0', flesh: '#FDBE3A', leaf: '#2F8A3B' },
  lime: { rind: '#6FA52C', pith: '#F4F8DA', flesh: '#D6EE86', leaf: '#2A7F36' },
};

/* ---------- colour helpers ---------- */
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const fromHex = (h) => {
  const m = String(h).replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const LIGHT_INK = [255, 251, 234];
const DARK_INK = [29, 27, 18];
const pickInk = (bg) => (contrast(LIGHT_INK, bg) >= 3 ? LIGHT_INK : DARK_INK);
const hueOf = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return { h: 0, s: 0, v: max };
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: d / max, v: max };
};

/* ---------- names ---------- */
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-') || 'lemon';
function parseName(file) {
  let base = path.basename(file, path.extname(file)).trim();
  let order = null;
  const m = base.match(/^(\d{1,3})[\s._-]+(.+)$/);
  if (m) { order = Number(m[1]); base = m[2]; }
  const name = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { name, order };
}

/* ---------- photo analysis ---------- */
async function analyse(file) {
  const N = 48;
  const { data } = await sharp(file, { failOn: 'none' }).rotate().resize(N, N, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * N + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const band = 3;
  const border = [], top = [], bottom = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (x < band || y < band || x >= N - band || y >= N - band) {
      const p = px(x, y); border.push(p);
      if (y < band) top.push(p);
      if (y >= N - band) bottom.push(p);
    }
  }
  const avg = (arr) => [0, 1, 2].map((i) => arr.reduce((s, p) => s + p[i], 0) / arr.length);
  const sd = (arr, m) => [0, 1, 2].map((i) => Math.sqrt(arr.reduce((s, p) => s + (p[i] - m[i]) ** 2, 0) / arr.length));
  const alpha = border.reduce((s, p) => s + p[3], 0) / border.length;
  const bAvg = avg(border);
  const spread = sd(border, bAvg).reduce((s, v) => s + v, 0) / 3;
  // fruit colour: median hue of bright, saturated pixels in the middle 70%
  const hues = [];
  for (let y = Math.floor(N * 0.15); y < Math.ceil(N * 0.85); y++) for (let x = Math.floor(N * 0.15); x < Math.ceil(N * 0.85); x++) {
    const p = px(x, y); if (p[3] < 128) continue;
    const { h, s, v } = hueOf(p);
    if (s > 0.45 && v > 0.55 && h > 20 && h < 150) hues.push(h);
  }
  hues.sort((a, b) => a - b);
  const hue = hues.length ? hues[Math.floor(hues.length / 2)] : 55;
  return {
    transparent: alpha < 200,
    solid: alpha >= 200 && spread < 28,
    bg: bAvg, bgTop: avg(top), bgBottom: avg(bottom),
    // yellow lemons measure ~47°, orange-ish Meyer ~40°, green limes 75°+
    tone: hue < 43.5 ? 'meyer' : hue > 75 ? 'lime' : 'lemon',
  };
}

/* ---------- process one image file ---------- */
async function processFile(file, index) {
  const ext = path.extname(file).toLowerCase();
  const { name, order } = parseName(file);
  const id = slug(name);
  const size = fs.statSync(file).size;
  const label = path.basename(file);
  if (size < 200) return { skip: `${label} is empty or broken (${size} bytes). Replace it with a real photo.` };

  const base = { id, name, order, file: label };

  if (ext === '.svg') {
    const txt = fs.readFileSync(file, 'utf8');
    if (!/<svg[\s>]/i.test(txt)) return { skip: `${label} is not a valid picture. Replace it with a real photo.` };
    const dest = `${id}.svg`;
    fs.writeFileSync(path.join(OUT_IMG, dest), txt);
    return { ...base, src: `assets/img/lemons/${dest}`, thumb: `assets/img/lemons/${dest}`, w: 600, h: 600, mode: 'cutout' };
  }

  if (!sharp) {
    const dest = `${id}${ext}`;
    fs.copyFileSync(file, path.join(OUT_IMG, dest));
    return { ...base, src: `assets/img/lemons/${dest}`, thumb: `assets/img/lemons/${dest}`, w: 800, h: 800, mode: ext === '.png' ? 'cutout' : 'framed' };
  }

  let meta;
  try { meta = await sharp(file, { failOn: 'none' }).rotate().metadata(); } catch { meta = null; }
  if (!meta || !meta.width) return { skip: `${label} could not be opened. Replace it with a real photo.` };
  // .metadata() ignores rotate(); swap for EXIF-rotated phone photos
  const swap = meta.orientation && meta.orientation >= 5;
  const W = swap ? meta.height : meta.width;
  const H = swap ? meta.width : meta.height;

  const a = await analyse(file);
  const mode = a.transparent ? 'cutout' : a.solid ? 'solid' : 'framed';
  if (W < 900) warn(`${label} is only ${W}×${H}px — it will look soft. Use a photo at least 1200px wide.`);

  const widths = [...new Set([480, 960, 1400].filter((t) => t <= Math.max(W, 480)))];
  const srcset = [];
  for (const t of widths) {
    const dest = `${id}-${t}.webp`;
    let pipe = sharp(file, { failOn: 'none' }).rotate().resize({ width: t, kernel: 'lanczos3' });
    if (t > W) pipe = pipe.sharpen({ sigma: 0.8 });
    await pipe.webp(mode === 'cutout' ? { quality: 86, alphaQuality: 90 } : { quality: 82 }).toFile(path.join(OUT_IMG, dest));
    srcset.push(`assets/img/lemons/${dest} ${t}w`);
  }
  const thumbDest = `${id}-thumb.webp`;
  await sharp(file, { failOn: 'none' }).rotate().resize(160, 160, { fit: 'cover', kernel: 'lanczos3' }).webp({ quality: 80 }).toFile(path.join(OUT_IMG, thumbDest));

  return {
    ...base,
    src: srcset[0].split(' ')[0],
    srcset: srcset.join(', '),
    thumb: `assets/img/lemons/${thumbDest}`,
    w: W, h: H, mode,
    _bg: mode === 'solid' ? a.bg : null,
    _bgTop: mode === 'solid' ? a.bgTop : null,
    _bgBottom: mode === 'solid' ? a.bgBottom : null,
    _tone: a.tone,
  };
}

/* ---------- main ---------- */
fs.mkdirSync(OUT_IMG, { recursive: true });
for (const f of fs.readdirSync(OUT_IMG)) fs.rmSync(path.join(OUT_IMG, f), { force: true, recursive: true });

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
let files = [];
if (fs.existsSync(IMAGE_DIR)) {
  files = fs.readdirSync(IMAGE_DIR)
    .filter((f) => EXTS.has(path.extname(f).toLowerCase()) && !f.startsWith('.'))
    .map((f) => path.join(IMAGE_DIR, f));
  info(`Photos folder: ${IMAGE_DIR} (${files.length} image files)`);
} else {
  warn(`Photos folder not found: ${IMAGE_DIR}`, '— check IMAGE_FOLDER in site/assets/js/config.js');
}

const items = [];
const seen = new Set();
for (const [i, file] of files.entries()) {
  let r;
  try { r = await processFile(file, i); }
  catch (e) { r = { skip: `${path.basename(file)} could not be processed (${e.message}).` }; }
  if (r.skip) { warn(r.skip); continue; }
  if (seen.has(r.id)) { warn(`${r.file}: another photo already uses the name "${r.name}" — skipped.`); continue; }
  seen.add(r.id);
  items.push(r);
}

// Featured variety first; drawing if it has no photo yet (Kagzi only)
const featuredId = FEATURED ? slug(FEATURED) : '';
if (featuredId && !items.some((v) => v.id === featuredId) && featuredId === 'kagzi') {
  items.push({ id: 'kagzi', name: 'Kagzi', src: 'assets/img/kagzi.svg', thumb: 'assets/img/kagzi.svg', w: 600, h: 600, mode: 'cutout', placeholder: true });
  info('No Kagzi photo yet — using the Kagzi drawing. Add Kagzi.jpg to the photos folder to replace it.');
}

let paletteIndex = 0;
const varieties = items.map((it) => {
  const known = KNOWN[it.id] || {};
  const o = overrideFor(it.name);
  const bgRGB = fromHex(o.bg) || it._bg || fromHex(known.bg) || fromHex(PALETTE[paletteIndex++ % PALETTE.length]);
  const topRGB = fromHex(o.bg) ? mix(bgRGB, [0, 0, 0], 0.12) : it._bgTop || mix(bgRGB, [0, 0, 0], 0.14);
  const bottomRGB = fromHex(o.bg) ? mix(bgRGB, [255, 255, 255], 0.08) : it._bgBottom || mix(bgRGB, [255, 255, 255], 0.1);
  const ink = fromHex(o.ink) || pickInk(bgRGB);
  const tone = TONES[o.tone] ? o.tone : known.tone || it._tone || 'lemon';
  return {
    id: it.id,
    name: o.name || it.name,
    tagline: o.tagline || known.tagline || DEFAULT_TAGLINE,
    badge: o.badge !== undefined ? o.badge : known.badge || '',
    src: it.src,
    srcset: it.srcset || '',
    thumb: it.thumb,
    w: it.w, h: it.h,
    mode: it.mode,
    placeholder: !!it.placeholder,
    bg: toHex(bgRGB), bgTop: toHex(topRGB), bgBottom: toHex(bottomRGB),
    ink: toHex(ink),
    ...TONES[tone],
    order: typeof o.order === 'number' ? o.order : it.order,
    hide: !!o.hide,
  };
});

varieties.sort((a, b) => {
  if (a.id === featuredId) return -1;
  if (b.id === featuredId) return 1;
  const ao = a.order ?? 1e6, bo = b.order ?? 1e6;
  return ao - bo || a.name.localeCompare(b.name);
});
const visible = varieties.filter((v) => !v.hide);
visible.forEach((v) => delete v.order);
varieties.forEach((v) => delete v.order);

fs.writeFileSync(
  path.join(SITE, 'assets', 'js', 'varieties.js'),
  '/* AUTO-GENERATED by scripts/build.mjs — do not edit by hand.\n   To change a tagline/colour/order, edit lemons.json and run update-lemons.bat. */\n' +
  'window.BB_VARIETIES = ' + JSON.stringify(varieties, null, 2) + ';\n'
);
ok(`Slider: ${visible.map((v) => v.name).join(', ') || '(no varieties!)'}`);

/* ---------- fonts ---------- */
fs.mkdirSync(FONTS, { recursive: true });
const fontCopies = [
  ['node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2', 'bricolage-grotesque-latin.woff2'],
  ['node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2', 'instrument-serif-latin-italic.woff2'],
];
let fontsOk = 0;
for (const [from, to] of fontCopies) {
  const src = path.join(ROOT, from);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(FONTS, to)); fontsOk++; }
}
if (fontsOk === fontCopies.length) ok('Fonts copied'); else info('Fonts will load from the internet (run npm install to include them).');

/* ---------- icons + preview image ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
if (sharp) {
  fs.mkdirSync(ICONS, { recursive: true });
  const fav = fs.readFileSync(path.join(SITE, 'favicon.svg'));
  for (const [size, name] of [[180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
    await sharp(fav, { density: 384 }).resize(size, size).png().toFile(path.join(ICONS, name));
  }
  try {
    const first = visible[0];
    let art = '';
    if (first) {
      if (first.src.endsWith('.svg')) {
        const svg = fs.readFileSync(path.join(SITE, first.src), 'utf8');
        const vb = (svg.match(/viewBox="([^"]+)"/) || [, '0 0 600 600'])[1];
        const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
        art = `<svg x="640" y="45" width="540" height="540" viewBox="${vb}">${inner}</svg>`;
      } else {
        const buf = await sharp(path.join(SITE, first.src)).resize(540, 540, { fit: 'cover' }).png().toBuffer();
        art = `<clipPath id="ogc"><circle cx="910" cy="315" r="262"/></clipPath><image x="640" y="45" width="540" height="540" clip-path="url(#ogc)" href="data:image/png;base64,${buf.toString('base64')}"/>`;
      }
    }
    const tpl = fs.readFileSync(path.join(ROOT, 'scripts', 'og-template.svg'), 'utf8')
      .replace('<!--ART-->', art)
      .replace(/__ART_BG__/g, first ? first.bg : '#0F5A3B')
      .replace(/__DOMAIN__/g, esc(SITE_URL.replace(/^https?:\/\//, '')));
    await sharp(Buffer.from(tpl), { density: 96 }).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(SITE, 'assets', 'img', 'og.jpg'));
    ok('App icons + WhatsApp preview image made');
  } catch (e) {
    warn('Could not make the preview image:', e.message);
  }
}

/* ---------- apply settings to every page ---------- */
const BUSINESS = CFG.BUSINESS_NAME || 'Bagawan Brothers';
const pageFiles = fs.readdirSync(SITE).filter((f) => f.endsWith('.html'))
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
// <!--bb:name--> … <!--/bb:name--> blocks (a function replacer so "$" in content is safe)
const getBlock = (html, tag) => {
  const m = html.match(new RegExp(`<!--bb:${tag}-->([\\s\\S]*?)<!--/bb:${tag}-->`));
  return m ? m[1] : null;
};
const setBlock = (html, tag, value) =>
  html.replace(new RegExp(`(<!--bb:${tag}-->)[\\s\\S]*?(<!--/bb:${tag}-->)`), (m, a, b) => a + value + b);
// header, menu, footer and icons are edited in index.html only — copied to the other pages here
const indexHtml = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
const SHARED = ['sprite', 'header', 'footer'];
const shared = Object.fromEntries(SHARED.map((t) => [t, getBlock(indexHtml, t)]));
const markCurrent = (block, file) => block
  .replace(/ aria-current="page"/g, '')
  .replace(new RegExp(`(<a\\b[^>]*?href="${file.replace(/\./g, '\\.')}")`, 'g'), '$1 aria-current="page"');

// lemon cards for the Home page (first 4) and the Lemons page (all)
const card = (v, i) => {
  const msg = `Hi ${BUSINESS}! I'm interested in ${v.name} lemons. Please share today's rate.`;
  const img = `<img src="${esc(v.src)}"${v.srcset ? ` srcset="${esc(v.srcset)}" sizes="(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 46vw"` : ''} width="${v.w}" height="${v.h}" alt="${esc(v.name)} lemons" loading="lazy" decoding="async">`;
  return `
          <article class="vcard vcard--${v.mode}" style="--vc-bg:${v.bg};--vc-ink:${v.ink};--delay:${((i % 4) * 0.06).toFixed(2)}s" data-reveal>
            <div class="vcard__pic">${img}</div>${v.badge ? `\n            <p class="vcard__badge">${esc(v.badge)}</p>` : ''}
            <h3 class="vcard__name">${esc(v.name)}</h3>
            <p class="vcard__tag">${esc(v.tagline)}</p>
            <a class="vcard__cta" data-wa data-wa-text="${esc(msg)}" href="https://wa.me/${WA}?text=${encodeURIComponent(msg)}"><svg aria-hidden="true"><use href="#ic-wa"/></svg>Ask rate</a>
          </article>`;
};
const cardsHome = visible.slice(0, 4).map(card).join('') + '\n        ';
const cardsAll = visible.map(card).join('') + '\n        ';

const first = visible[0];
for (const file of pageFiles) {
  const fp = path.join(SITE, file);
  let html = fs.readFileSync(fp, 'utf8');
  for (const t of SHARED) {
    if (file !== 'index.html' && shared[t] != null && getBlock(html, t) != null) html = setBlock(html, t, shared[t]);
    const blk = getBlock(html, t);
    if (blk != null && t !== 'sprite') html = setBlock(html, t, markCurrent(blk, file));
  }
  if (SITE_URL) {
    const pageUrl = `${SITE_URL}/${file === 'index.html' ? '' : file}`;
    html = html
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${pageUrl}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${pageUrl}$2`)
      .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${SITE_URL}/assets/img/og.jpg$2`)
      .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${SITE_URL}/assets/img/og.jpg$2`)
      .replace(/("url":\s*")[^"]*(")/, `$1${SITE_URL}/$2`)
      .replace(/("image":\s*")[^"]*(")/, `$1${SITE_URL}/assets/img/og.jpg$2`);
  }
  if (WA) {
    html = html
      .replace(/https:\/\/wa\.me\/\d+/g, `https://wa.me/${WA}`)
      .replace(/tel:\+\d+/g, `tel:+${WA}`)
      .replace(/("telephone":\s*")[^"]*(")/, `$1+${WA}$2`)
      .replace(/(<[^>]*data-phone-text[^>]*>)[^<]*(<)/g, (m, a, b) => a + esc(PHONE_DISPLAY) + b);
  }
  html = setBlock(html, 'cards-home', cardsHome);
  html = setBlock(html, 'cards-all', cardsAll);
  if (file === 'index.html' && first) {
    html = html.replace(/(<meta name="theme-color" content=")[^"]*(")/, `$1${first.bg}$2`);
    html = setBlock(html, 'title', esc(first.name));
    html = setBlock(html, 'tag', esc(first.tagline));
    const inkRGB = fromHex(first.ink);
    const lightInk = lum(inkRGB) > 0.5;
    const heroVars = [
      `--hero-bg:${first.bg}`, `--hero-bg-top:${first.bgTop}`, `--hero-bg-bottom:${first.bgBottom}`, `--hero-ink:${first.ink}`,
      `--hero-line:rgba(${inkRGB.join(',')},.38)`, `--hero-soft:rgba(${inkRGB.join(',')},.14)`,
      `--hero-pill:${lightInk ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.42)'}`, '--hero-btn:#FFFDF5', `--hero-btn-ink:${lightInk ? first.bgTop : first.ink}`,
      `--rind:${first.rind}`, `--pith:${first.pith}`, `--flesh:${first.flesh}`, `--leaf-f:${first.leaf}`,
    ].join(';');
    html = html.replace(/(\/\*bb:style\*\/)[\s\S]*?(\/\*\/bb:style\*\/)/, (m, a, b) => `${a}${heroVars};${b}`);
    const img = `<figure class="prod prod--${first.mode}"><img src="${esc(first.src)}"${first.srcset ? ` srcset="${esc(first.srcset)}" sizes="(min-width: 900px) 40vw, 80vw"` : ''} width="${first.w}" height="${first.h}" alt="${esc(first.name)} lemons" fetchpriority="high" decoding="async"></figure>`;
    html = setBlock(html, 'prod', img);
  }
  fs.writeFileSync(fp, html);
}
ok(`Pages updated: ${pageFiles.join(', ')}`);

if (SITE_URL) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pageFiles.map((f) => `  <url><loc>${SITE_URL}/${f === 'index.html' ? '' : f}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}
ok(`Settings applied (${SITE_URL || 'no website address set'}, ${PHONE_DISPLAY || 'no phone set'})`);

/* ---------- summary ---------- */
const key = String(CFG.WEB3FORMS_ACCESS_KEY || '');
if (!/^[0-9a-f-]{30,}$/i.test(key)) info('Form: no Web3Forms key — enquiries go to WhatsApp only.');
if (/maktaba\.rouf\.in/i.test(SITE_URL)) warn('SITE_URL is maktaba.rouf.in — that is your Maktaba app. Use a separate address for the lemon site.');
console.log('');
if (WARNINGS.length) console.log(`  Done with ${WARNINGS.length} note(s) above.`);
else console.log('  All done!');
console.log('  Preview: open site\\index.html   |   Publish: upload the "site" folder\n');
