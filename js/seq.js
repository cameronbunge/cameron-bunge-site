/* Photo + Video as a sequence: one frame at a time in a locked page. Each category is a run of groups; each group a run of frames (one or
   more pictures on the page at once — set in the sort tool, kept in the database). The category name holds the top-left corner with the
   group's title under it. Wheel, arrow keys, a click on either half of the screen, or a swipe move through the frames; frames cut.
   PLACING: every picture can be dragged anywhere in the band and sized by its corner; the arrangement is saved per picture. */
(function () {
  var S = window.SITE, body = document.body, stage = document.getElementById('stage'), whereL = document.getElementById('whereL'), whereR = document.getElementById('whereR');
  var desktop = function () { return window.matchMedia('(min-width: 901px)').matches; };
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* every picture of the section by src, so a saved arrangement (a list of srcs) finds its captions, orientation and video details */
  var all = {}, lcNames = {}, exists = function (s) { return !!all[s]; };
  S.projects.forEach(function (p) { p.imgs.forEach(function (m) { if (m.src && !m.ph && !m.model) all[m.src] = m; }); });   /* the rest of the site, for pictures pulled in through the sort tool's drawer */
  S.photo.forEach(function (c) { c.groups.forEach(function (g) { if (g.lc && g.name) lcNames[g.name.toLowerCase()] = 1; g.imgs.forEach(function (m) { all[m.src] = m; }); }); });
  function keepCase(g) { return !!(g.lc || (g.name && (lcNames[g.name.toLowerCase()] || /^enc0re$/i.test(g.name.trim())))); }

  var saved = null;   /* the sort tool's document: { cats: [{ id, groups: [{ name, frames: [[src]] }] }], known: [src] } */
  var frames = [], els = [], cur = 0;
  function build() {
    var html = [];
    frames = [];
    S.photo.forEach(function (cat) {
      var sc = saved && saved.cats ? saved.cats.filter(function (x) { return x.id === cat.id; })[0] : null;
      S.arrangePhoto(cat, sc, saved && saved.known, exists).forEach(function (g) {
        g.frames.forEach(function (f) {
          var items = f.map(function (s) { return all[s]; }).filter(Boolean); if (!items.length) return;
          frames.push({ cat: cat, g: g, items: items });
          html.push('<section class="fr imgs g' + items.length + '"><div class="grp">' + items.map(function (m, j) {
            var pic = m.yt ? '<iframe src="https://www.youtube.com/embed/' + m.yt + (m.si ? '?si=' + m.si : '') + '" title="' + esc(g.name || 'YouTube video player') + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
              : m.v ? '<video src="' + m.src + '" muted autoplay loop playsinline preload="metadata"' + (m.ar ? ' style="aspect-ratio:' + m.ar + '"' : '') + '></video>'
              : '<img src="' + m.src + '" alt="" loading="lazy" draggable="false">';
            return '<div class="c c' + (j + 1) + ' ' + (m.o || 'l') + (m.yt ? ' video' : '') + '" data-src="' + esc(m.src) + '">' + pic +
              (j === items.length - 1 ? '<span class="date' + (/enc0re/i.test(m.cap || '') ? ' keep' : '') + '">' + esc(m.cap || m.date || 'MM.YYYY') + '</span>' : '') +
              '<span class="grip" aria-hidden="true"></span></div>';
          }).join('') + '</div></section>');
        });
      });
    });
    stage.innerHTML = html.join('');
    Array.prototype.forEach.call(stage.querySelectorAll('video'), function (v) { v.addEventListener('click', function (e) { e.stopPropagation(); v.muted = !v.muted; }); });
    els = Array.prototype.slice.call(stage.children);
    els.forEach(function (el) { Array.prototype.forEach.call(el.querySelectorAll('.c'), placeable); applyLayout(el); });
  }

  /* the corner: the category, and under it the title of the group this frame belongs to (pale TITLE until it has one) */
  function corner(f) {
    whereL.innerHTML = '<span class="cat">' + esc(f.cat.name).toUpperCase() + '</span>' +
      (f.g.name ? '<span class="grpname' + (keepCase(f.g) ? ' keep' : '') + '">' + esc(f.g.name) + '</span>' : '<span class="grpname ph">TITLE</span>');
  }
  function show(k) {
    if (!els.length) return;
    cur = Math.max(0, Math.min(els.length - 1, k));
    var el = els[cur], f = frames[cur];
    stage.innerHTML = ''; stage.appendChild(el);
    [1, 2].forEach(function (d) { var n = els[cur + d]; if (!n) return; Array.prototype.forEach.call(n.querySelectorAll('img[loading]'), function (im) { im.removeAttribute('loading'); var x = new Image(); x.src = im.src; }); });
    corner(f);
    whereR.innerHTML = pad(cur + 1) + '<span class="of"> / ' + pad(els.length) + '</span>';
    /* a video plays while its frame is up (a frame taken off the page pauses, and would not start again by itself) */
    Array.prototype.forEach.call(el.querySelectorAll('video'), function (v) { v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); });
    compose(el, cur); showWild();
    requestAnimationFrame(function () { el.classList.add('in'); paint(el); });
  }
  function step(d) { show(cur + d); }

  var acc = 0, lock = 0;
  window.addEventListener('wheel', function (e) {
    if (!desktop() || body.classList.contains('about-open')) return;
    e.preventDefault();
    var now = Date.now(); if (now < lock) return;
    acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(acc) > 60) { step(acc > 0 ? 1 : -1); acc = 0; lock = now + 420; }
  }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || body.classList.contains('about-open')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  });
  /* where the page is locked away from YouTube (this preview), say so in the frame instead of showing nothing */
  document.addEventListener('securitypolicyviolation', function (e) {
    if (!/youtube\.com/.test(e.blockedURI || '')) return;
    els.forEach(function (el) { Array.prototype.forEach.call(el.querySelectorAll('.c.video'), function (c) { if (c.querySelector('.blocked')) return; var n = document.createElement('p'); n.className = 'blocked'; n.innerHTML = '<span class="b">[</span> YOUTUBE EMBED — SHOWS ON THE LIVE SITE, NOT IN THIS PREVIEW <span class="b">]</span>'; c.appendChild(n); }); });
  });
  var dragged = false;
  stage.addEventListener('click', function (e) { if (!desktop()) return; if (dragged) { dragged = false; return; } step(e.clientX < window.innerWidth / 2 ? -1 : 1); });
  document.getElementById('next').addEventListener('click', function () { step(1); });
  document.getElementById('prev').addEventListener('click', function () { step(-1); });
  var tx = null; stage.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); tx = null; }, { passive: true });

  /* PLACING. A picture dragged, or sized by its corner, is kept where it is put: left/top as a share of the band, width as a share of the
     screen (vw). The first touch on a frame fixes every picture in it where it stands, so nothing else moves. Saved per picture (by src) to
     the database as layout/photo; RESET FRAME lets the frame fall back into its own composition. */
  var placeEl = document.getElementById('place'), db = null, saveTimer = null, layout = {};
  function note(t, on) { if (!placeEl) return; placeEl.textContent = t; placeEl.classList.toggle('on', !!on); }
  function applyLayout(el) {
    var cs = Array.prototype.slice.call(el.querySelectorAll('.c')), any = false;
    cs.forEach(function (c) {
      var v = layout[c.getAttribute('data-src')];
      ['x', 'y', 'w'].forEach(function (p) { if (v && v[p]) { c.style.setProperty('--' + p, v[p]); any = true; } else c.style.removeProperty('--' + p); });
    });
    el.classList.toggle('placed', any);
    if (!any) compose(el, els.indexOf(el));
    paint(el);
  }
  function freeze(el) {
    var fr = el.getBoundingClientRect();
    Array.prototype.forEach.call(el.querySelectorAll('.c'), function (c) {
      var m = c.querySelector('img, video, iframe'), r = (m || c).getBoundingClientRect();
      c.style.setProperty('--x', ((r.left - fr.left) / fr.width * 100).toFixed(2) + '%');
      c.style.setProperty('--y', ((r.top - fr.top) / fr.height * 100).toFixed(2) + '%');
      c.style.setProperty('--w', (r.width / window.innerWidth * 100).toFixed(2) + 'vw');
    });
    el.classList.add('placed');
  }
  function remember(c) { var k = c.getAttribute('data-src'), v = layout[k] || {}; ['x', 'y', 'w'].forEach(function (p) { var s = c.style.getPropertyValue('--' + p); if (s) v[p] = s; }); layout[k] = v; }
  function save() {
    if (!db) { note('NOT SAVED: OPEN FROM YOUR OWN ACCOUNT'); return; }
    note('…'); if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { db.doc('layout/photo').set({ pics: layout, tune: tune, savedAt: new Date().toISOString() }).then(function () { note('PLACED · SAVED', true); }, function () { note('NOT SAVED'); }); }, 500);
  }
  function placeable(c) {
    var sx, sy, ox, oy, ow, moved = false, active = false, sizing = false, el = null, fr = null, wasPlaced = false;
    c.addEventListener('pointerdown', function (e) {
      if (!desktop() || e.button !== 0 || window.SITE_LIVE) return;
      el = c.closest('.fr'); wasPlaced = el.classList.contains('placed');
      if (!wasPlaced) freeze(el);   /* the first touch fixes every picture of the frame where it stands */
      fr = el.getBoundingClientRect();
      var r = c.getBoundingClientRect();
      active = true; moved = false; sizing = !!e.target.closest('.grip');
      sx = e.clientX; sy = e.clientY; ox = r.left - fr.left; oy = r.top - fr.top; ow = r.width;
      c.setPointerCapture(e.pointerId); c.classList.add('held');
      if (e.target.tagName !== 'VIDEO') e.preventDefault();
    });
    c.addEventListener('pointermove', function (e) {
      if (!active) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (sizing) {
        var w = Math.max(40, ow + dx);
        c.style.setProperty('--w', (w / window.innerWidth * 100).toFixed(2) + 'vw');
      } else {
        c.style.setProperty('--x', ((ox + dx) / fr.width * 100).toFixed(2) + '%');
        c.style.setProperty('--y', ((oy + dy) / fr.height * 100).toFixed(2) + '%');
      }
      paint(el);
    });
    function drop(e) {
      if (!active) return; active = false; c.classList.remove('held');
      try { c.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) { dragged = true; setTimeout(function () { dragged = false; }, 0); Array.prototype.forEach.call(el.querySelectorAll('.c'), remember); save(); }
      else if (!wasPlaced) applyLayout(el);   /* a plain click: the frame falls back to its own composition */
    }
    c.addEventListener('pointerup', drop); c.addEventListener('pointercancel', drop);
  }
  /* COMPOSITION (the WILD slider, 0–100). At 0 a frame keeps its own composition: centred, stepped. Above 0 a seeded hand sets the
     pictures of each frame — pushed off centre, sized up or down, allowed to overlap — and towards the top of the range one picture in a
     frame can grow past the band and lie under the words (the words go white where they cross it). Each frame has its own temperament, so
     at a middle setting some frames stay calm while others go off. A frame placed by hand is left alone. [ KEEP FRAME ] saves what the hand
     did as that frame's placement; [ RESHUFFLE ] deals every frame again. */
  var tune = {}, seed = 1;   /* per frame (keyed by its first picture): { wild, seed }; the slider shows and sets the frame on screen */
  function keyOf(el) { var c = el && el.querySelector('.c'); return c ? c.getAttribute('data-src') : ''; }
  function tuneOf(el) { var k = keyOf(el); return tune[k] || (tune[k] = { wild: 0, seed: 1 }); }
  function rnd(a, b) {   /* a steady number in [0,1) for frame a, slot b and the seed */
    var t = (a + 1) * 374761393 + (b + 1) * 668265263 + seed * 2246822519; t = (t ^ (t >>> 13)) * 1274126177; t = (t ^ (t >>> 16)) >>> 0;
    return (t % 100000) / 100000;
  }
  function ratioOf(c) {
    var m = c.querySelector('img, video, iframe');
    if (m && m.tagName === 'IMG' && m.naturalWidth) return m.naturalWidth / m.naturalHeight;
    if (m && m.tagName === 'VIDEO' && m.videoWidth) return m.videoWidth / m.videoHeight;
    if (m && m.tagName === 'IFRAME') return 16 / 9;
    return c.classList.contains('p') ? 2 / 3 : 3 / 2;
  }
  function compose(el, fi) {
    var t = tuneOf(el), k = (t.wild || 0) / 100; seed = t.seed || 1;
    if (el.classList.contains('placed') || !desktop()) { el.classList.remove('auto'); return; }
    var cs = Array.prototype.slice.call(el.querySelectorAll('.c')), n = cs.length;
    if (!k || !n) { el.classList.remove('auto'); cs.forEach(function (c) { ['--x', '--y', '--w'].forEach(function (p) { c.style.removeProperty(p); }); c.style.zIndex = ''; }); return; }
    var fr = el.getBoundingClientRect(), W = fr.width, H = fr.height, VW = window.innerWidth, VH = window.innerHeight;
    var temper = rnd(fi, 0), kf = k * (0.3 + 0.7 * temper * temper);   /* this frame's share of the slider */
    var hero = (kf > 0.4 && rnd(fi, 1) < 0.7) ? Math.floor(rnd(fi, 2) * n) : -1;   /* the one that goes under the words */
    var base = H * (n === 1 ? 1 : n === 2 ? 0.8 : n === 3 ? 0.62 : 0.5);
    cs.forEach(function (c, i) {
      var r = ratioOf(c), h, w, x, y;
      if (i === hero) {
        h = VH * (0.9 + 0.6 * rnd(fi, 10 + i) * kf); w = h * r;
        x = (W - w) / 2 + (rnd(fi, 20 + i) - 0.5) * (W * 0.9) * kf;
        y = (VH - h) / 2 - fr.top + (rnd(fi, 30 + i) - 0.5) * (VH * 0.4) * kf;
        c.style.zIndex = 0;
      } else {
        h = base * (1 + (rnd(fi, 10 + i) - 0.5) * 0.9 * kf); w = h * r;
        var slot = (n === 1 || hero !== -1) ? W / 2 : (i + 0.5) / n * W;
        if (hero !== -1 && n > 1) { var others = cs.length - 1, j = i < hero ? i : i - 1; slot = (j + 0.5) / others * W; }
        x = slot - w / 2 + (rnd(fi, 20 + i) - 0.5) * (W * 0.7) * kf;
        y = (H - h) / 2 + (rnd(fi, 30 + i) - 0.5) * (H * 0.9) * kf;
        c.style.zIndex = 1;
      }
      c.style.setProperty('--x', (x / W * 100).toFixed(2) + '%');
      c.style.setProperty('--y', (y / H * 100).toFixed(2) + '%');
      c.style.setProperty('--w', (w / VW * 100).toFixed(2) + 'vw');
    });
    el.classList.add('auto');
  }
  /* the words go white where a picture lies under them: the text is a clipped background, black with a white rectangle per picture */
  function paint(el) {
    if (!desktop()) return;
    var targets = [document.querySelector('.ttl'), whereR, document.querySelector('.mark h1'), document.querySelector('.mark .under')].concat(Array.prototype.slice.call(whereL.children));
    var rects = Array.prototype.map.call(el.querySelectorAll('.c img, .c video, .c iframe'), function (m) { return m.getBoundingClientRect(); });
    targets.forEach(function (t) {
      if (!t) return;
      var o = t.getBoundingClientRect(), img = [], size = [], pos = [];
      rects.forEach(function (r) {
        if (r.right < o.left || r.left > o.right || r.bottom < o.top || r.top > o.bottom) return;
        img.push('linear-gradient(#fff,#fff)'); size.push(r.width.toFixed(1) + 'px ' + r.height.toFixed(1) + 'px'); pos.push((r.left - o.left).toFixed(1) + 'px ' + (r.top - o.top).toFixed(1) + 'px');
      });
      t.style.backgroundImage = img.length ? img.join(',') : 'none'; t.style.backgroundSize = size.join(','); t.style.backgroundPosition = pos.join(',');
    });
  }
  stage.addEventListener('load', function (e) { if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') { var el = e.target.closest('.fr'); if (el && el === els[cur]) { compose(el, cur); paint(el); } } }, true);
  stage.addEventListener('loadedmetadata', function (e) { var el = e.target.closest('.fr'); if (el && el === els[cur]) { compose(el, cur); paint(el); } }, true);
  window.addEventListener('resize', function () { var el = els[cur]; if (el) { compose(el, cur); paint(el); } });
  var wildEl = document.getElementById('wild'), wildVal = document.getElementById('wildVal');
  function showWild() { var el = els[cur], t = el ? tuneOf(el) : { wild: 0 }; if (wildEl) wildEl.value = t.wild || 0; if (wildVal) wildVal.textContent = t.wild || 0; }
  function setWild(v) {
    var el = els[cur]; if (!el) return;
    var t = tuneOf(el); t.wild = Math.max(0, Math.min(100, v | 0)); showWild();
    if (el.classList.contains('placed')) {   /* the slider takes a hand-placed frame back: its placement is let go so the hand can work */
      Array.prototype.forEach.call(el.querySelectorAll('.c'), function (c) { delete layout[c.getAttribute('data-src')]; });
      el.classList.remove('placed'); note('HAND PLACEMENT LET GO · THE SLIDER HAS THIS FRAME', true);
    }
    compose(el, cur); paint(el); save();
  }
  if (wildEl) wildEl.addEventListener('input', function () { setWild(+wildEl.value); });
  var shuffleBtn = document.getElementById('placeShuffle');
  if (shuffleBtn) shuffleBtn.addEventListener('click', function () {
    var el = els[cur]; if (!el) return; var t = tuneOf(el); t.seed = ((t.seed || 1) % 9973) + 1;
    if (el.classList.contains('placed')) { Array.prototype.forEach.call(el.querySelectorAll('.c'), function (c) { delete layout[c.getAttribute('data-src')]; }); el.classList.remove('placed'); }
    if (!t.wild) { t.wild = 50; showWild(); }   /* a reshuffle at 0 would change nothing: it starts the hand at the middle */
    compose(el, cur); paint(el); save(); note('RESHUFFLED THIS FRAME', true);
  });
  var keepBtn = document.getElementById('placeKeep');
  if (keepBtn) keepBtn.addEventListener('click', function () {
    var el = els[cur]; if (!el || el.classList.contains('placed')) { note('ALREADY PLACED BY HAND', true); return; }
    freeze(el); el.classList.remove('auto'); Array.prototype.forEach.call(el.querySelectorAll('.c'), remember); save(); note('FRAME KEPT', true);
  });
  var resetBtn = document.getElementById('placeReset');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    var el = els[cur]; if (!el) return;
    Array.prototype.forEach.call(el.querySelectorAll('.c'), function (c) { delete layout[c.getAttribute('data-src')]; });
    applyLayout(el); save(); note('FRAME RESET', true);
  });

  build(); show(0);
  window.claude && claude.use('db').then(function (d) {
    db = d; if (!db) { note('PLACING NOT SAVED HERE (READ-ONLY)'); return; }
    return Promise.all([db.doc('sort/photo').get(), db.doc('sort/removed').get()]).then(function (r) {
      var v = r[0].exists ? r[0].data() : null;
      if (v && v.cats) { saved = v; }
      var rv = r[1].exists ? r[1].data() : null; (rv && rv.srcs || []).forEach(function (s) { delete all[s]; });   /* removed in the media hub */
      if (!saved) saved = { cats: [], known: [] };   /* so the removal takes even with nothing sorted yet */
      return db.doc('layout/photo').get();
    }).then(function (snap) {
      var v = snap.exists ? snap.data() : null; if (v && v.pics) layout = v.pics;
      if (v && v.tune) tune = v.tune;
      build(); show(Math.min(cur, els.length - 1));
      note(Object.keys(layout).length ? 'PLACED · SAVED ' + new Date(v.savedAt).toLocaleString() : 'DRAG A PICTURE TO PLACE IT · ITS CORNER TO SIZE IT', true);
    });
  }).catch(function () { note('PLACING NOT SAVED HERE'); });
})();
