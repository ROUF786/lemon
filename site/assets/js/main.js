/* ==========================================================================
   Bagawan Brothers — site behaviour
   Mobile first · no libraries · also works when opened straight from the folder
   Settings come from config.js, the lemon list from varieties.js (auto-made).
   ========================================================================== */
(() => {
  'use strict';
  window.BB_READY = true;

  const CFG = window.BB_CONFIG || {};
  const ALL = Array.isArray(window.BB_VARIETIES) ? window.BB_VARIETIES : [];
  const docEl = document.documentElement;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const media = (q) => window.matchMedia(q);
  const onMedia = (m, fn) => (m.addEventListener ? m.addEventListener('change', fn) : m.addListener(fn));
  const mqReduce = media('(prefers-reduced-motion: reduce)');
  const mqDesktop = media('(min-width: 900px)');
  const mqMouse = media('(hover: hover) and (pointer: fine)');
  const reduced = () => mqReduce.matches;
  const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 300));
  const pad = (n) => String(n).padStart(2, '0');
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const EASE_IO = 'cubic-bezier(.65, 0, .35, 1)';
  const PAGE_COLOR = '#FFF8E6';  // browser bar colour below the slider (cream)
  const MENU_COLOR = '#FFD43B';  // browser bar colour while the menu is open (lemon)
  const SIZES = '(min-width: 900px) 40vw, 80vw';
  const rgbOf = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (hex, a) => `rgba(${(rgbOf(hex) || [255, 251, 234]).join(', ')}, ${a})`;

  /* ------------------------------------------------------------------
     1. WhatsApp + phone links (number comes from config.js)
     ------------------------------------------------------------------ */
  const NAME = CFG.BUSINESS_NAME || 'Bagawan Brothers';
  const WA = String(CFG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const PHONE_TEXT = CFG.PHONE_DISPLAY || (WA ? `+${WA}` : '');
  const HELLO = `Hi ${NAME}! I'd like today's lemon rate.`;
  const waHref = (text) => `https://wa.me/${WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  // Phones: open WhatsApp in the same tab (the app takes over). Computers: new tab.
  const linkTarget = (a) => {
    if (mqMouse.matches) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); }
  };

  // a link can carry its own message, e.g. the lemon cards: data-wa-text="...Kagzi..."
  $$('[data-wa]').forEach((a) => { a.href = waHref(a.getAttribute('data-wa-text') || HELLO); linkTarget(a); });
  if (WA) $$('[data-tel]').forEach((a) => { a.href = `tel:+${WA}`; });
  if (PHONE_TEXT) $$('[data-phone-text]').forEach((el) => { el.textContent = PHONE_TEXT; });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ------------------------------------------------------------------
     2. Header state, floating WhatsApp button, phone browser-bar colour
     ------------------------------------------------------------------ */
  const header = $('[data-header]');
  const hero = $('[data-hero]');
  const fab = $('[data-fab]');
  const metaTheme = $('meta[name="theme-color"]');
  // every page has a coloured top (slider or page top) ending in [data-hero-end]
  const ui = { pastHero: !$('[data-hero-end]'), nearEnd: false, menu: false, heroColor: metaTheme ? metaTheme.content : PAGE_COLOR };
  let slider = null;

  const paintChrome = () => {
    if (header) header.classList.toggle('is-solid', ui.pastHero);
    if (fab) fab.classList.toggle('is-on', ui.pastHero && !ui.nearEnd && !ui.menu);
    if (metaTheme) metaTheme.content = ui.menu ? MENU_COLOR : ui.pastHero ? PAGE_COLOR : ui.heroColor;
  };

  if ('IntersectionObserver' in window) {
    const end = $('[data-hero-end]');
    const hh = header ? header.offsetHeight : 72;
    if (end) {
      new IntersectionObserver(([e]) => {
        ui.pastHero = !e.isIntersecting && e.boundingClientRect.top < hh;
        paintChrome();
      }, { rootMargin: `-${hh}px 0px 0px 0px` }).observe(end);
    }
    // hide the floating button while the form or the footer is on screen (they have WhatsApp buttons)
    const near = new Set();
    const nearIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
      ui.nearEnd = near.size > 0;
      paintChrome();
    }, { rootMargin: '0px 0px -12% 0px' });
    $$('#order, .footer').forEach((el) => nearIO.observe(el));
  } else {
    ui.pastHero = true;
  }
  paintChrome();

  /* ------------------------------------------------------------------
     3. Full-screen menu (phones)
     ------------------------------------------------------------------ */
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const setMenu = (open, moveFocus = true) => {
    if (!menu || !menuBtn || open === ui.menu) return;
    ui.menu = open;
    docEl.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    const label = $('.sr-only', menuBtn);
    if (label) label.textContent = open ? 'Close menu' : 'Menu';
    menu.toggleAttribute('inert', !open);
    $$('main, footer, [data-fab]').forEach((el) => el.toggleAttribute('inert', open));
    paintChrome();
    if (slider) slider.sync();
    if (moveFocus) (open ? $('a', menu) : menuBtn).focus({ preventScroll: true });
  };
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(!ui.menu));
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      setMenu(false, false);
      // send keyboard / screen-reader focus to the section the link points to
      const hash = a.getAttribute('href') || '';
      const target = hash.length > 1 && hash[0] === '#' ? document.getElementById(hash.slice(1)) : null;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
    const brand = header && $('.brand', header);
    if (brand) brand.addEventListener('click', () => setMenu(false, false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ui.menu) setMenu(false); });
    onMedia(mqDesktop, (e) => { if (e.matches) setMenu(false, false); });
  }

  /* ------------------------------------------------------------------
     4. HERO — colour-changing lemon slider
     ------------------------------------------------------------------ */
  // Where the floating slices / leaves sit for each slide: [left %, top %, rotate°, scale]
  // (2 behind the lemons, then 6 in front — same order as in index.html)
  const LAYOUTS = [
    [[16, 22, -20, 1], [84, 30, 30, 1], [12, 70, -12, 1], [86, 74, 18, 1], [24, 10, 40, 1], [78, 12, -30, 1], [64, 6, 0, 1], [92, 92, 10, 1]],
    [[82, 20, 40, 1.1], [14, 36, -15, 0.95], [88, 64, -24, 1], [10, 82, 16, 1.05], [74, 8, -40, 1], [18, 14, 20, 1], [36, 4, 0, 1], [4, 96, -10, 1]],
    [[20, 80, 25, 1], [80, 14, -20, 1.05], [8, 40, 10, 1.1], [90, 46, -18, 0.95], [30, 92, -160, 1], [86, 88, 30, 1], [18, 10, 0, 1], [96, 6, 20, 0.9]],
  ];

  const initSlider = () => {
    if (!hero) return null;
    const V = ALL.filter((v) => v && !v.hide && v.src && v.name);
    const roll = $('[data-roll]', hero);
    const titleEl = $('.hero__title', hero);
    const tagEl = $('[data-tag]', hero);
    const badgeEl = $('[data-badge]', hero);
    const prodBox = $('[data-prod]', hero);
    const thumbsBox = $('[data-thumbs]', hero);
    const dotsBox = $('[data-dots]', hero);
    const countEl = $('[data-count]', hero);
    const nav = $('[data-nav]', hero);
    const prevBtn = $('[data-prev]', hero);
    const nextBtn = $('[data-next]', hero);
    const pauseBtn = $('[data-pause]', hero);
    const live = $('[data-live]', hero);
    const heroWa = $('.hero__actions [data-wa]', hero);
    const floaters = $$('.stage__back .fl, .stage__front .fl', hero);

    const secs = CFG.AUTOPLAY_SECONDS == null ? 6 : Number(CFG.AUTOPLAY_SECONDS) || 0;
    const S = {
      i: 0,
      timer: 0,
      autoplayMs: Math.max(0, secs) * 1000,
      userPaused: reduced(),     // people who ask for less motion start paused (they can press play)
      inView: true,
      keyFocus: false,
    };
    hero.style.setProperty('--autoplay', `${S.autoplayMs / 1000 || 6}s`);

    /* --- title: short names big, long names shrink to fit one line --- */
    let rollItem = roll ? $('.roll__item', roll) : null;
    const measure = document.createElement('span');
    measure.className = 'hero__measure';
    measure.setAttribute('aria-hidden', 'true');
    if (titleEl) titleEl.appendChild(measure);
    const sizeItem = (el) => {
      if (!titleEl || !el) return;
      const max = parseFloat(getComputedStyle(titleEl).fontSize);
      const avail = titleEl.clientWidth;
      if (!avail || !max) return;
      measure.textContent = el.textContent;
      const w = measure.getBoundingClientRect().width;
      measure.textContent = '';
      el.style.fontSize = w > avail * 0.97 ? `${Math.floor((max * avail * 0.97) / w)}px` : '';
    };
    const fitTitle = () => { if (roll) $$('.roll__item', roll).forEach(sizeItem); };

    const setTitle = (name, dir) => {
      if (!roll) return;
      if (!rollItem) { rollItem = document.createElement('span'); rollItem.className = 'roll__item'; roll.appendChild(rollItem); }
      if (!dir || reduced() || !rollItem.animate) {
        $$('.roll__item', roll).forEach((el) => { if (el !== rollItem) el.remove(); });
        rollItem.textContent = name;
        sizeItem(rollItem);
        return;
      }
      const next = document.createElement('span');
      next.className = 'roll__item';
      next.textContent = name;
      roll.appendChild(next);
      sizeItem(next);
      const old = rollItem;
      rollItem = next;
      const d = dir > 0 ? 1 : -1;
      const H = roll.clientHeight + 8; // move a full box height so nothing peeks out
      const opts = { duration: 820, easing: EASE, fill: 'both' };
      const out = old.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-d * H}px)` }], opts);
      out.onfinish = () => old.remove();
      next.animate([{ transform: `translateY(${d * H}px)` }, { transform: 'translateY(0)' }], { ...opts, delay: 60 });
    };

    const setText = (el, text) => {
      if (!el || el.textContent === text) return;
      clearTimeout(el._bbT);
      if (reduced()) { el.textContent = text; return; }
      el.classList.add('is-swapping');
      el._bbT = setTimeout(() => { el.textContent = text; el.classList.remove('is-swapping'); }, 280);
    };
    const setBadge = (text) => {
      if (!badgeEl) return;
      if (text) { badgeEl.textContent = text; badgeEl.classList.add('is-on'); } else { badgeEl.classList.remove('is-on'); }
    };

    /* --- colours --- */
    const applyTheme = (v) => {
      const st = docEl.style;
      [['--hero-bg', v.bg], ['--hero-bg-top', v.bgTop], ['--hero-bg-bottom', v.bgBottom], ['--hero-ink', v.ink],
        ['--rind', v.rind], ['--pith', v.pith], ['--flesh', v.flesh], ['--leaf-f', v.leaf]]
        .forEach(([k, val]) => { if (val) st.setProperty(k, val); });
      if (v.ink) {
        const c = rgbOf(v.ink) || [29, 27, 18];
        const lightInk = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 140;
        st.setProperty('--hero-line', rgba(v.ink, 0.38));
        st.setProperty('--hero-soft', rgba(v.ink, 0.14));
        // pills & buttons: soft white on light colours, soft shade on strong colours
        st.setProperty('--hero-pill', lightInk ? 'rgba(0, 0, 0, .16)' : 'rgba(255, 255, 255, .42)');
        st.setProperty('--hero-btn', '#FFFDF5');
        st.setProperty('--hero-btn-ink', lightInk ? (v.bgTop || v.bg) : v.ink);
      }
      if (v.bg) ui.heroColor = v.bg;
      paintChrome();
    };

    /* --- the lemon photo --- */
    const buildProd = (v) => {
      const fig = document.createElement('figure');
      fig.className = `prod prod--${v.mode || 'cutout'}`;
      const img = new Image();
      img.decoding = 'async';
      if (v.srcset) { img.srcset = v.srcset; img.sizes = SIZES; }
      img.src = v.src;
      img.width = v.w || 600;
      img.height = v.h || 600;
      img.alt = `${v.name} lemons`;
      img.draggable = false;
      fig.appendChild(img);
      return fig;
    };
    let shown = prodBox ? $('.prod', prodBox) : null;
    let pending = null;
    const swapProd = (v, dir) => {
      if (!prodBox) return;
      const next = buildProd(v);
      pending = next;
      const img = next.firstChild;
      const ready = img.decode ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = r; img.onerror = r; });
      Promise.race([ready, new Promise((r) => setTimeout(r, 650))]).then(() => {
        if (pending !== next) return; // a newer slide was asked for meanwhile
        pending = null;
        const out = shown;
        shown = next;
        prodBox.appendChild(next);
        if (!out) return;
        if (!dir || reduced() || !next.animate) { out.remove(); return; }
        const d = dir > 0 ? 1 : -1;
        const from = out.style.transform || 'none';
        const a = out.animate([
          { transform: from, opacity: 1 },
          { transform: `translateX(${-d * 46}%) rotate(${-d * 18}deg) scale(.7)`, opacity: 0 },
        ], { duration: 680, easing: EASE_IO, fill: 'forwards' });
        a.onfinish = () => out.remove();
        next.animate([
          { transform: `translateX(${d * 46}%) rotate(${d * 18}deg) scale(.7)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ], { duration: 980, easing: EASE, delay: 110, fill: 'backwards' });
      });
    };

    const placeFloaters = (k) => {
      const L = LAYOUTS[k % LAYOUTS.length];
      floaters.forEach((el, n) => {
        const p = L[n % L.length];
        el.style.left = `${p[0]}%`;
        el.style.top = `${p[1]}%`;
        el.style.setProperty('--r', `${p[2]}deg`);
        el.style.setProperty('--s', String(p[3]));
        el.style.transitionDelay = `${n * 0.035}s`;
      });
    };

    /* --- preloading so every slide appears instantly --- */
    const loaded = new Set();
    const preload = (v) => {
      if (!v || loaded.has(v.id)) return;
      loaded.add(v.id);
      const img = new Image();
      if (v.srcset) { img.srcset = v.srcset; img.sizes = SIZES; }
      img.src = v.src;
    };

    /* --- thumbnails (computer), dots (phone), counter --- */
    const thumbs = [];
    const dots = [];
    if (thumbsBox) {
      V.forEach((v, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'thumb';
        const pic = document.createElement('span');
        pic.className = 'thumb__img';
        if (v.bg) pic.style.background = v.bg;
        const im = new Image();
        im.src = v.thumb || v.src;
        im.alt = '';
        im.width = 58;
        im.height = 58;
        im.loading = 'lazy';
        im.decoding = 'async';
        im.draggable = false;
        pic.appendChild(im);
        const nm = document.createElement('span');
        nm.className = 'thumb__name';
        nm.textContent = v.name;
        const bar = document.createElement('span');
        bar.className = 'thumb__bar';
        bar.appendChild(document.createElement('i'));
        b.append(pic, nm, bar);
        b.addEventListener('click', () => go(k, { user: true }));
        thumbsBox.appendChild(b);
        thumbs.push(b);
      });
    }
    if (dotsBox) V.forEach(() => { const i = document.createElement('i'); dotsBox.appendChild(i); dots.push(i); });
    if (nav && V.length > 7) nav.classList.add('is-many');

    /* --- autoplay --- */
    const canPlay = () => S.autoplayMs > 0 && V.length > 1 && !S.userPaused && S.inView && !S.keyFocus && !ui.menu && !document.hidden;
    const stop = () => { clearTimeout(S.timer); S.timer = 0; };
    const sync = () => {
      stop();
      const play = canPlay();
      if (play) {
        // restart the little progress bar
        hero.classList.remove('is-playing');
        void hero.offsetWidth;
        hero.classList.add('is-playing');
        S.timer = setTimeout(() => go(S.i + 1, { dir: 1 }), S.autoplayMs);
      } else {
        hero.classList.remove('is-playing');
      }
    };
    const setPauseUI = () => {
      if (!pauseBtn) return;
      const paused = S.userPaused;
      pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      const use = $('use', pauseBtn);
      if (use) use.setAttribute('href', paused ? '#ic-play' : '#ic-pause');
    };

    /* --- show a slide --- */
    const render = (k, dir, user) => {
      const v = V[k];
      applyTheme(v);
      setTitle(v.name, dir);
      setText(tagEl, v.tagline || '');
      setBadge(v.badge || '');
      swapProd(v, dir);
      placeFloaters(k);
      thumbs.forEach((t, j) => t.setAttribute('aria-current', String(j === k)));
      dots.forEach((d, j) => d.classList.toggle('is-on', j === k));
      if (countEl) countEl.innerHTML = `<b>${pad(k + 1)}</b> / ${pad(V.length)}`;
      if (heroWa && WA) heroWa.href = waHref(`Hi ${NAME}! I'm interested in ${v.name} lemons. Please share today's rate.`);
      if (user && live) live.textContent = `${v.name}. ${v.tagline || ''} (${k + 1} of ${V.length})`;
      const n = V.length;
      idle(() => { preload(V[(k + 1) % n]); preload(V[(k - 1 + n) % n]); });
    };
    const go = (to, { user = false, dir } = {}) => {
      const n = V.length;
      if (n < 2) return;
      const k = ((to % n) + n) % n;
      if (k === S.i) { sync(); return; }
      const d = dir || (k > S.i ? 1 : -1);
      S.i = k;
      render(k, d, user);
      sync();
    };

    /* --- first paint --- */
    if (!V.length) {
      // No lemon list yet (update-lemons.bat not run) — keep the built-in Kagzi slide.
      if (nav) nav.hidden = true;
      if (thumbsBox) thumbsBox.hidden = true;
      fitTitle();
      return { sync() {}, fit: fitTitle };
    }
    const first = V[0];
    const firstImg = shown && $('img', shown);
    if (!firstImg || firstImg.getAttribute('src') !== first.src) {
      if (shown) shown.remove();
      shown = buildProd(first);
      if (prodBox) prodBox.appendChild(shown);
    }
    loaded.add(first.id);
    applyTheme(first);
    setTitle(first.name, 0);
    if (tagEl) tagEl.textContent = first.tagline || '';
    setBadge(first.badge || '');
    placeFloaters(0);
    thumbs.forEach((t, j) => t.setAttribute('aria-current', String(j === 0)));
    dots.forEach((d, j) => d.classList.toggle('is-on', j === 0));
    if (countEl) countEl.innerHTML = `<b>01</b> / ${pad(V.length)}`;
    if (heroWa && WA) heroWa.href = waHref(`Hi ${NAME}! I'm interested in ${first.name} lemons. Please share today's rate.`);
    fitTitle();

    if (V.length < 2) {
      if (nav) nav.hidden = true;
      if (thumbsBox) thumbsBox.hidden = true;
      return { sync() {}, fit: fitTitle };
    }
    if (pauseBtn && S.autoplayMs === 0) pauseBtn.hidden = true;
    setPauseUI();

    /* --- controls --- */
    if (prevBtn) prevBtn.addEventListener('click', () => go(S.i - 1, { user: true, dir: -1 }));
    if (nextBtn) nextBtn.addEventListener('click', () => go(S.i + 1, { user: true, dir: 1 }));
    if (pauseBtn) pauseBtn.addEventListener('click', () => { S.userPaused = !S.userPaused; setPauseUI(); sync(); });
    hero.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(S.i + 1, { user: true, dir: 1 }); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(S.i - 1, { user: true, dir: -1 }); }
    });
    // keyboard users: stop the autoplay while they are on the slider controls
    hero.addEventListener('focusin', (e) => {
      let kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { kb = false; }
      if (kb && e.target.closest('.hero__bar')) { S.keyFocus = true; sync(); }
    });
    hero.addEventListener('focusout', (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.hero__bar')) { if (S.keyFocus) { S.keyFocus = false; sync(); } }
    });

    /* --- swipe (phones) / drag the lemons (computer) --- */
    let drag = null;
    const snapBack = () => {
      const el = shown;
      if (!el) return;
      const from = el.style.transform;
      el.style.transform = '';
      if (from && el.animate && !reduced()) el.animate([{ transform: from }, { transform: 'none' }], { duration: 420, easing: EASE });
    };
    hero.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && (e.button !== 0 || !e.target.closest('.hero__stage'))) return;
      if (e.target.closest('a, button, input, textarea, select, .hero__bar')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, on: false };
    });
    hero.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) { drag = null; return; } // vertical — the page scrolls
        drag.on = true;
        drag.t = performance.now();
        drag.x0 = dx;
        try { hero.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        stop();
        hero.classList.remove('is-playing');
        hero.classList.add('is-dragging');
      }
      drag.dx = dx;
      if (shown && !reduced()) shown.style.transform = `translateX(${dx * 0.4}px) rotate(${dx * 0.025}deg)`;
    });
    const endDrag = (e, cancelled) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag;
      drag = null;
      hero.classList.remove('is-dragging');
      if (!d.on) return;
      const speed = Math.abs(d.dx - (d.x0 || 0)) / Math.max(performance.now() - d.t, 1);
      if (!cancelled && (Math.abs(d.dx) > 56 || (speed > 0.45 && Math.abs(d.dx) > 22))) {
        const step = d.dx < 0 ? 1 : -1;
        go(S.i + step, { user: true, dir: step });
      } else {
        snapBack();
        sync();
      }
    };
    hero.addEventListener('pointerup', (e) => endDrag(e, false));
    hero.addEventListener('pointercancel', (e) => endDrag(e, true));
    // (only our own capture ending counts — the image losing its automatic touch capture is normal)
    hero.addEventListener('lostpointercapture', (e) => { if (e.target === hero && drag && drag.on && e.pointerId === drag.id) endDrag(e, false); });

    /* --- only run while visible --- */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        const vis = e.isIntersecting;
        if (vis !== S.inView) { S.inView = vis; sync(); }
      }, { threshold: 0.3 }).observe(hero);
    }
    document.addEventListener('visibilitychange', sync);
    onMedia(mqReduce, () => { if (reduced()) { S.userPaused = true; setPauseUI(); sync(); } });

    window.addEventListener('load', () => idle(() => V.forEach(preload)));
    sync();
    return { sync, fit: fitTitle };
  };
  slider = initSlider();

  /* ------------------------------------------------------------------
     5. Scroll reveals + word-by-word headings
     ------------------------------------------------------------------ */
  const splitWords = (el) => {
    const plain = el.textContent.replace(/\s+/g, ' ').trim();
    let i = 0;
    const wrapText = (node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        inner.textContent = part;
        inner.style.setProperty('--i', String(i++));
        w.appendChild(inner);
        frag.appendChild(w);
      });
      return frag;
    };
    const walk = (parent) => {
      Array.from(parent.childNodes).forEach((n) => {
        if (n.nodeType === 3) parent.replaceChild(wrapText(n), n);
        else if (n.nodeType === 1) walk(n);
      });
    };
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    while (el.firstChild) visual.appendChild(el.firstChild);
    walk(visual);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = plain;
    el.append(sr, visual);
  };
  $$('[data-split]').forEach(splitWords);

  const revealEls = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window && !reduced()) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     6. Enquiry form → email (Web3Forms) or WhatsApp
     ------------------------------------------------------------------ */
  const form = $('[data-form]');
  if (form) {
    const KEY = String(CFG.WEB3FORMS_ACCESS_KEY || '').trim();
    const emailOn = /^[0-9a-f-]{30,}$/i.test(KEY);
    const nameIn = $('#f-name', form);
    const phoneIn = $('#f-phone', form);
    const cityOther = $('[data-city-other]', form);
    const cityOtherIn = $('#f-city', form);
    const noteBtn = $('[data-add-note]', form);
    const noteWrap = $('#f-note-wrap', form);
    const noteIn = $('#f-note', form);
    const errBox = $('[data-form-error]', form);
    const submitBtn = $('[data-submit]', form);
    const submitLabel = $('[data-submit-label]', form);
    const waLink = $('[data-send-wa]', form);
    const card = form.closest('.order__card') || form;
    const done = $('[data-done]');
    const doneName = $('[data-done-name]');
    const doneWa = $('[data-done-wa]');
    const resetBtn = $('[data-reset]');
    let sending = false;

    if (!emailOn) form.classList.add('email-off');

    const digitsOf = (s) => {
      let d = String(s || '').replace(/\D/g, '');
      if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
      if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
      return d;
    };
    const niceNumber = (d) => (d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
    const picked = (name) => { const el = $(`input[name="${name}"]:checked`, form); return el ? el.value : ''; };
    const collect = () => {
      const city = picked('city');
      return {
        name: nameIn.value.trim().replace(/\s+/g, ' '),
        phone: digitsOf(phoneIn.value),
        city: city === 'Other' ? (cityOtherIn.value.trim() || 'Other') : city,
        business: picked('business'),
        qty: picked('qty'),
        note: noteIn ? noteIn.value.trim() : '',
      };
    };
    const waMessage = (d) => {
      const lines = [`Hi ${NAME}! 🍋 I'd like today's lemon rate.`];
      const add = (label, value) => { if (value) lines.push(`${label}: ${value}`); };
      if (d.name || d.city || d.business || d.qty || d.note) lines.push('');
      add('Name', d.name);
      add('City', d.city);
      add('Business', d.business);
      add('Quantity', d.qty);
      add('Note', d.note);
      return lines.join('\n');
    };

    /* errors */
    const setErr = (input, msg) => {
      const field = input.closest('.field');
      let err = $('.field__err', field);
      if (!err) {
        err = document.createElement('p');
        err.className = 'field__err';
        err.id = `${input.id}-err`;
        field.appendChild(err);
      }
      err.textContent = msg;
      field.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', err.id);
    };
    const clearErr = (input) => {
      const field = input.closest('.field');
      field.classList.remove('is-invalid');
      const err = $('.field__err', field);
      if (err) err.remove();
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    };
    const showError = (msg) => { errBox.textContent = msg; errBox.hidden = false; };
    const validate = (d) => {
      const bad = [];
      if (d.name.length < 2) { setErr(nameIn, 'Please enter your name.'); bad.push(nameIn); }
      if (!/^[6-9]\d{9}$/.test(d.phone)) {
        setErr(phoneIn, d.phone ? 'Enter a 10-digit mobile number.' : 'Please enter your WhatsApp number.');
        bad.push(phoneIn);
      }
      if (bad.length) bad[0].focus();
      return !bad.length;
    };

    /* live WhatsApp link — always has the latest details */
    const updateWa = () => { if (waLink) waLink.href = waHref(waMessage(collect())); };
    if (waLink) linkTarget(waLink);
    if (doneWa) linkTarget(doneWa);
    updateWa();

    form.addEventListener('input', (e) => {
      if (e.target === nameIn || e.target === phoneIn) clearErr(e.target);
      if (!errBox.hidden) errBox.hidden = true;
      updateWa();
    });
    form.addEventListener('change', (e) => {
      if (e.target.name === 'city') {
        const other = e.target.value === 'Other';
        cityOther.hidden = !other;
        if (other) cityOtherIn.focus();
      }
      updateWa();
    });
    phoneIn.addEventListener('blur', () => {
      const d = digitsOf(phoneIn.value);
      if (d.length === 10) phoneIn.value = niceNumber(d);
    });
    if (noteBtn && noteWrap) {
      noteBtn.addEventListener('click', () => {
        const open = noteWrap.hidden;
        noteWrap.hidden = !open;
        noteBtn.setAttribute('aria-expanded', String(open));
        if (open && noteIn) noteIn.focus();
      });
    }

    const setBusy = (on) => {
      sending = on;
      submitBtn.classList.toggle('is-busy', on);
      submitBtn.setAttribute('aria-disabled', String(on));
      submitLabel.textContent = on ? 'Sending…' : 'Send enquiry';
      const use = $('use', submitBtn);
      if (use) use.setAttribute('href', on ? '#ic-spin' : '#ic-arrow');
    };

    const showDone = (d) => {
      if (doneName) doneName.textContent = d.name.split(' ')[0] || 'friend';
      if (doneWa) doneWa.href = waHref(waMessage(d));
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      const top = card.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.45) card.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;
      errBox.hidden = true;
      if (!emailOn) { if (waLink) waLink.click(); return; }
      const d = collect();
      [nameIn, phoneIn].forEach(clearErr);
      if (!validate(d)) return;
      const trap = $('input[name="botcheck"]', form);
      if (trap && trap.checked) { showDone(d); return; } // a bot filled the hidden box
      setBusy(true);
      const ctrl = window.AbortController ? new AbortController() : null;
      const timeout = setTimeout(() => ctrl && ctrl.abort(), 15000);
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: KEY,
            subject: `${CFG.EMAIL_SUBJECT || 'New enquiry'}: ${d.name}${d.city ? `, ${d.city}` : ''}`,
            from_name: `${NAME} website`,
            Name: d.name,
            WhatsApp: `+91 ${niceNumber(d.phone)}`,
            City: d.city || '-',
            Business: d.business || '-',
            Quantity: d.qty || '-',
            Note: d.note || '-',
            'Reply on WhatsApp': `https://wa.me/91${d.phone}`,
          }),
          signal: ctrl ? ctrl.signal : undefined,
        });
        let json = {};
        try { json = await res.json(); } catch (err) { json = {}; }
        if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
        showDone(d);
      } catch (err) {
        showError('Could not send right now. Please tap “Send on WhatsApp” — your details are already filled in.');
      } finally {
        clearTimeout(timeout);
        setBusy(false);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        [nameIn, phoneIn].forEach(clearErr);
        cityOther.hidden = true;
        if (noteWrap) noteWrap.hidden = true;
        if (noteBtn) noteBtn.setAttribute('aria-expanded', 'false');
        errBox.hidden = true;
        done.hidden = true;
        form.hidden = false;
        updateWa();
        nameIn.focus();
      });
    }
  }

  /* ------------------------------------------------------------------
     7. Giant footer wordmark — always exactly as wide as the screen
     ------------------------------------------------------------------ */
  const mark = $('.footer__mark');
  const markText = $('[data-wordmark]');
  const fitMark = () => {
    if (!mark || !markText) return;
    mark.style.setProperty('--wordmark-size', '100px');
    const w = markText.getBoundingClientRect().width;
    const avail = mark.clientWidth;
    if (w && avail) mark.style.setProperty('--wordmark-size', `${((100 * avail * 0.97) / w).toFixed(2)}px`);
  };

  /* ------------------------------------------------------------------
     8. Re-measure after fonts load / screen width changes
     ------------------------------------------------------------------ */
  const refit = () => { if (slider && slider.fit) slider.fit(); fitMark(); };
  refit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  let lastW = window.innerWidth;
  let rT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      if (window.innerWidth === lastW) return; // phone address bar showing/hiding — ignore
      lastW = window.innerWidth;
      refit();
    }, 120);
  });
  onMedia(mqMouse, () => $$('[data-wa], [data-send-wa], [data-done-wa]').forEach(linkTarget));
})();
