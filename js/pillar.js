/* Renders a section page from SITE: the title, the line of entry names, the sheet (one row of pictures) with its terms, the copy, the nav.
   Which section a page is depends on the structure under review (I / K, shared with home through localStorage): the page's file is
   looked up in that structure, which says its number, its name and which working sections it gathers. */
(function () {
  var body = document.body, S = window.SITE;
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var structKey = body.getAttribute('data-struct') || 'b';   /* locked 10/11 */
  var structure = S.structures[structKey] || S.structures.b;
  var pillar = structure.pillars.filter(function (p) { return p.file === file; })[0]
    || S.pillars.filter(function (p) { return p.file === file; })[0] || structure.pillars[0];
  var isPhoto = body.classList.contains('seq');   /* the sequence page: seq.js draws it; only the chrome and the switcher below apply */
  body.setAttribute('data-struct', structKey);

  /* title and nav from the structure */
  var ttl = document.querySelector('.ttl');
  if (ttl) { ttl.innerHTML = (pillar.n ? '<span class="n">' + pillar.n + '</span>' : '') + '<span class="w">' + pillar.name + '</span>'; document.title = (pillar.n ? pillar.n + ' ' : '') + pillar.name + ' — ' + (S.site && S.site.nameLines && S.site.nameLines.length ? S.site.nameLines.join(' ') : 'Cameron Bunge'); }
  var nav = document.getElementById('pillars');
  nav.innerHTML = [{ id: 'home', n: '', name: 'Home', file: 'index.html' }].concat(structure.pillars).filter(function (p) { return p.file !== pillar.file; }).map(function (p) {
    return '<a href="' + p.file + '"><span class="b">[</span> ' + (p.n ? p.n + ' ' : '') + p.name.toUpperCase() + ' <span class="b">]</span></a>';
  }).join('');

  /* the entries: the projects tagged with any working section this one gathers, then — when it gathers Photo + Video and this is not the
     sequence page — the photo categories, each as one entry whose pictures are all of its groups */
  var entries = [];
  if (!isPhoto) {
    S.projects.forEach(function (p) { if (p.pillars.some(function (w) { return pillar.from.indexOf(w) !== -1; })) entries.push(p); });
    if (pillar.from.indexOf('photo') !== -1) S.photo.forEach(function (c) {
      var imgs = c.groups.reduce(function (a, g) { return a.concat(g.imgs); }, []);
      if (imgs.length) entries.push({ id: c.id, name: c.name, lc: c.lc, meta: c.meta || 'Photography', imgs: imgs, copy: '', bul: [] });
    });
  }

  /* top-align the names with the name top-right: find where each one's capitals actually start (from the rendered font's metrics,
     since a line-height under 1 shifts the letters out of their box). The name stays put, as on home. */
  var mark = document.querySelector('.mark h1');
  function inkTop(el) {
    var cs = getComputedStyle(el), ctx = document.createElement('canvas').getContext('2d');
    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var m = ctx.measureText('CAMERON'), lh = parseFloat(cs.lineHeight);
    if (isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
    return el.getBoundingClientRect().top + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent);
  }
  var page = document.querySelector('.page'), pane = document.querySelector('.pane'), line = document.getElementById('line');
  function alignTop() {
    if (!mark || !ttl) return;
    ttl.style.marginTop = ''; if (line) line.style.marginTop = '';
    nav.style.removeProperty('--navw'); if (pane) pane.style.removeProperty('--pane-top');
    if (!window.matchMedia('(min-width: 901px)').matches) return;
    var low = line && line.firstElementChild;   /* Title Low: the names hold the top of the page */
    var target = low ? line.querySelector('a') : ttl, host = low ? line : ttl;
    if (target) { var d = inkTop(mark) - inkTop(target); if (isFinite(d)) host.style.marginTop = d.toFixed(2) + 'px'; }
    /* the nav spreads across the title's width, its type shrinking a little if the brackets would not fit on one line */
    var tw = ttl.getBoundingClientRect().width;
    nav.style.fontSize = ''; nav.style.setProperty('--navw', tw.toFixed(1) + 'px');
    var txts = document.getElementById('txts'); if (txts) txts.style.setProperty('--navw', tw.toFixed(1) + 'px');   /* the copy above the title is as wide as the title */
    var need = 0; Array.prototype.forEach.call(nav.children, function (a) { need += a.getBoundingClientRect().width; });
    need += (nav.children.length - 1) * 10;
    if (need > tw) nav.style.fontSize = Math.max(8.5, 11 * tw / need).toFixed(2) + 'px';
    /* the sheet starts under the names */
    if (pane && line && low) fitSheet();
  }

  /* the sheet: one row, every picture at its own proportions, the row as wide as the SHEET slider says (a share of the page between the
     gutters), unless the pictures would then run into the copy, in which case the row is as tall as fits. The pane takes the row's width,
     so the ALIGN option can hold it to the right edge or centre it. */
  function ratioOf(c) {
    var el = c.firstElementChild;
    if (el.tagName === 'VIDEO') { if (el.videoWidth) return el.videoWidth / el.videoHeight; var ar = (el.style.aspectRatio || '').split('/'); return ar.length === 2 ? parseFloat(ar[0]) / parseFloat(ar[1]) : 0.75; }
    return el.naturalWidth ? el.naturalWidth / el.naturalHeight : 1.5;
  }
  /* the media never runs edge to edge: its left edge lines up with the first letter of the title's word (the B of BRAND), and it
     keeps the same distance in from the right */
  function edges() {
    var w = ttl && ttl.querySelector('.w'), inset = (w || ttl).getBoundingClientRect().left;
    pane.style.right = inset.toFixed(1) + 'px';
    return { inset: inset, width: window.innerWidth - 2 * inset };
  }
  function fitSheet() {
    var set = document.querySelector('.set.on'), nat = set && set.querySelector('.nat'), txt = document.getElementById('txts'); if (!set || !txt || !pane) return;
    if (!window.matchMedia('(min-width: 901px)').matches) {   /* the phone lays itself out (css/phone.css): nothing measured, nothing set */
      pane.style.width = ''; pane.style.right = ''; pane.style.removeProperty('--pane-top');
      Array.prototype.forEach.call(set.querySelectorAll('.c'), function (c) { c.style.width = ''; c.style.height = ''; });
      return;
    }
    if (set.classList.contains('mishka')) {
      /* Mishka's trio fills the band: the pane spans the page, the films are as tall as the band less the terms */
      var pt2 = page.getBoundingClientRect().top, bt2 = line.getBoundingClientRect().bottom + 28;
      var bb2 = Math.min((body.getAttribute('data-copy') || '') === 'none' ? Infinity : txt.getBoundingClientRect().top, ttl.getBoundingClientRect().top) - 24;
      var meta2 = set.querySelector('.meta'), mh2 = meta2 ? meta2.getBoundingClientRect().height + 14 : 0;
      pane.style.width = edges().width.toFixed(1) + 'px';
      set.style.setProperty('--sh', Math.max(120, bb2 - bt2 - mh2).toFixed(1) + 'px');
      pane.style.setProperty('--pane-top', (bt2 - pt2).toFixed(1) + 'px');
      return;
    }
    if (!nat) {
      /* the coming-soon line: the pane spans the page and the line sits in the middle of the band */
      var pt = page.getBoundingClientRect().top, bt = line.getBoundingClientRect().bottom + 28;
      var bb = Math.min((body.getAttribute('data-copy') || '') === 'none' ? Infinity : txt.getBoundingClientRect().top, ttl.getBoundingClientRect().top) - 24;
      pane.style.width = edges().width.toFixed(1) + 'px';
      pane.style.setProperty('--pane-top', (bt - pt + Math.max(0, (bb - bt - set.getBoundingClientRect().height) / 2)).toFixed(1) + 'px');
      return;
    }
    if (set.classList.contains('placed')) {
      /* placed by hand: the pictures sit where they were put, the arrangement scaled as one to the stage (see layoutPlaced); only the
         terms line keeps to the band's bottom edge */
      var pt3 = page.getBoundingClientRect().top, bt3 = line.getBoundingClientRect().bottom + 28, none3 = (body.getAttribute('data-copy') || '') === 'none';
      var bb3 = Math.min(none3 ? Infinity : txt.getBoundingClientRect().top, ttl.getBoundingClientRect().top) - 24;
      var meta3 = set.querySelector('.meta'), mh3 = meta3 ? meta3.getBoundingClientRect().height : 0;
      edges();
      /* the terms stack in the bottom right corner of the page, one under another, their right edge on the gutter and their last line
         level with the nav; the stage then runs down to the copy */
      var lr3 = line.getBoundingClientRect(), navB3 = nav.getBoundingClientRect().bottom;
      pane.style.right = lr3.left.toFixed(1) + 'px'; pane.style.width = (window.innerWidth - 2 * lr3.left).toFixed(1) + 'px';
      pane.style.setProperty('--pane-top', Math.max(bt3 - pt3, navB3 - mh3 - 14 - pt3).toFixed(1) + 'px');
      layoutPlaced(set);
      return;
    }
    var cells = Array.prototype.slice.call(nat.children), gap = 8, sum = 0;
    cells.forEach(function (c) { sum += ratioOf(c); });
    var focus = false;
    var share = (parseFloat(body.getAttribute('data-sheetw')) || 66) / 100;
    var ed = edges(), pageW = ed.width;
    var W = pageW * share, h = (W - gap * (cells.length - 1)) / sum;
    /* the band the row lives in: from under the names to above the copy; the row (with its terms) sits in the middle of it */
    var pageTop = page.getBoundingClientRect().top, bandTop = line.getBoundingClientRect().bottom + 28;
    /* the band ends above whatever is highest under it: the copy (wherever it sits, since the row can run the full width) or the title —
       or, in focus, the section nav */
    var copyMode = body.getAttribute('data-copy') || 'flyer-right';
    var bandBottom = focus ? nav.getBoundingClientRect().top - 24 : Math.min(copyMode === 'none' ? Infinity : txt.getBoundingClientRect().top, ttl.getBoundingClientRect().top) - 24;
    var centre = function (paneW) { pane.style.right = (focus ? ed.inset + Math.max(0, (pageW - paneW) / 2) : ed.inset).toFixed(1) + 'px'; };
    var meta = set.querySelector('.meta'), metaH = meta ? meta.getBoundingClientRect().height + 14 : 0;
    var hmax = bandBottom - bandTop - metaH;
    if (nat.classList.contains('grid')) {
      /* the grid: justified rows — every picture in a row at one height, the row filling the width edge to edge (a short row is left at a
         capped height rather than blown up); the whole thing scaled down if its rows would run into the copy */
      var cols = parseInt(nat.style.getPropertyValue('--cols'), 10) || 3, g = 8, rg = 8;
      var rowsEl = Array.prototype.slice.call(nat.querySelectorAll('.row'));
      var spec = rowsEl.map(function (r) { var cs2 = Array.prototype.slice.call(r.children), rs = cs2.map(ratioOf), sum2 = rs.reduce(function (a, b) { return a + b; }, 0); return { cells: cs2, rs: rs, sum: sum2 }; });
      function heights(width) { var cap = (width / cols) * 1.35; return spec.map(function (sp) { return Math.min(cap, (width - g * (sp.cells.length - 1)) / sp.sum); }); }
      var hs = heights(W), total = hs.reduce(function (a, b) { return a + b; }, 0) + rg * (hs.length - 1);
      if (total > hmax && total > 0) { W = W * hmax / total; hs = heights(W); total = hs.reduce(function (a, b) { return a + b; }, 0) + rg * (hs.length - 1); }
      spec.forEach(function (sp, ri) { sp.cells.forEach(function (c, ci) { c.style.width = (hs[ri] * sp.rs[ci]).toFixed(1) + 'px'; c.style.height = hs[ri].toFixed(1) + 'px'; }); });
      pane.style.width = W.toFixed(1) + 'px'; centre(W);
      pane.style.setProperty('--pane-top', (bandTop - pageTop + Math.max(0, (bandBottom - bandTop - total - metaH) / 2)).toFixed(1) + 'px');
      return;
    }
    if (h > hmax) h = Math.max(60, hmax);
    nat.style.setProperty('--sh', h.toFixed(1) + 'px');
    var paneW = Math.min(pageW, h * sum + gap * (cells.length - 1));
    pane.style.width = paneW.toFixed(1) + 'px'; centre(paneW);
    pane.style.setProperty('--pane-top', (bandTop - pageTop + Math.max(0, (bandBottom - bandTop - h - metaH) / 2)).toFixed(1) + 'px');
  }
  window.addEventListener('resize', alignTop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignTop);

  var rows = [], sets = [], txts = [], currentId = null;
  /* PLACING (the PLACE toggle in the review strip, or the media hub's PLACE ON PAGE, or #place): every picture of the project on screen can
     be dragged anywhere and sized by its corner. The first touch fixes the project's pictures where they stand; from then on that project
     shows its placed arrangement to everyone, placing mode or not. Saved per section to the database (layout/<section>), per project, per
     picture: left, top and width as hundredths of the STAGE's width — the stage being the page between the gutters, from under the name
     top-right to above the copy (less the terms line). The arrangement is drawn as one piece: scaled with the stage so the pictures keep
     their distances from each other on any screen, shrunk as a group when the stage is too short for it, and moved down (and shrunk) if it
     would run into the line of names. RESET PROJECT lets the project fall back to its row or grid. Entries from before 10/29 (left/top as a
     share of the screen, width in vw) are read as they were and converted on the first draw. */
  var playout = {}, placeDb = null, placeTimer = null, placeNote = null, stageOf = {};
  function note(t, on) { if (!placeNote) return; placeNote.textContent = t; placeNote.classList.toggle('on', !!on); }
  function placingOn() { return body.classList.contains('placing'); }
  function stageRect(set) {   /* gutter to gutter (the names' left edge to the name top-right's right edge), from under that name to above the copy */
    var mr = document.querySelector('.mark').getBoundingClientRect(), lr = line.getBoundingClientRect(), txt = document.getElementById('txts');
    var none = (body.getAttribute('data-copy') || '') === 'none', meta = set.querySelector('.meta'), mh = meta ? meta.getBoundingClientRect().height + 14 : 0;
    var top = mr.bottom + 16;
    var metaTop = meta ? meta.getBoundingClientRect().top : Infinity;
    var bottom = Math.min(none ? Infinity : txt.getBoundingClientRect().top, ttl.getBoundingClientRect().top, metaTop) - 20;
    var keepR = 0; Array.prototype.forEach.call(line.querySelectorAll('a'), function (a) { keepR = Math.max(keepR, a.getBoundingClientRect().right); });
    return { left: lr.left, top: top, width: window.innerWidth - 2 * lr.left, height: Math.max(60, bottom - top), keep: { right: keepR + 24, bottom: lr.bottom + 24 } };
  }
  function unitsOf(v, st) {   /* an entry in stage units, converting one saved before 10/29 (shares of the screen) on the fly */
    if (typeof v.x === 'number') return v;
    var s = st.width / 100;
    return { x: (parseFloat(v.x) / 100 * window.innerWidth - st.left) / s, y: (parseFloat(v.y) / 100 * window.innerHeight - st.top) / s, w: parseFloat(v.w) * window.innerWidth / 100 / s };
  }
  function layoutPlaced(set) {
    var id = set.getAttribute('data-id'), lay = id && playout[id]; if (!lay) return;
    var st = stageRect(set), cs = Array.prototype.slice.call(set.querySelectorAll('.c')), items = [], k = 0;
    cs.forEach(function (c) {
      var src = c.getAttribute('data-src'), v = lay[src];
      if (v) { v = unitsOf(v, st); lay[src] = v; }
      else v = { x: 2 + 14 * (k++), y: 0, w: 12 };   /* a picture added since the project was placed: parked top-left at a modest size, to be dragged into place */
      items.push({ c: c, u: v, h: v.w / ratioOf(c) });
    });
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(function (it) { minX = Math.min(minX, it.u.x); minY = Math.min(minY, it.u.y); maxX = Math.max(maxX, it.u.x + it.u.w); maxY = Math.max(maxY, it.u.y + it.h); });
    var cw = Math.max(1, maxX - minX), ch = Math.max(1, maxY - minY);
    var s = st.width / 100; if (ch * s > st.height) s = st.height / ch;
    var ox, oy, top = null;
    for (var t = 0; t < 4; t++) {
      ox = st.left + (st.width - cw * s) / 2 - minX * s;
      if (top === null) top = st.top + Math.max(0, (st.height - ch * s) / 2);
      oy = top - minY * s;
      var dy = 0;   /* anything that would sit over the names pushes the whole arrangement down, and shrinks it if it then runs out of room */
      items.forEach(function (it) { var l = ox + it.u.x * s, tp = oy + it.u.y * s; if (l < st.keep.right && tp < st.keep.bottom) dy = Math.max(dy, st.keep.bottom - tp); });
      if (dy < 0.5) break;
      top += dy;
      if (top + ch * s > st.top + st.height) s = Math.max(0.05, (st.top + st.height - top) / ch);
    }
    items.forEach(function (it) {
      it.c.style.setProperty('--x', (ox + it.u.x * s).toFixed(1) + 'px'); it.c.style.setProperty('--y', (oy + it.u.y * s).toFixed(1) + 'px'); it.c.style.setProperty('--w', (it.u.w * s).toFixed(1) + 'px');
      it.c.style.width = ''; it.c.style.height = '';
    });
    stageOf[id] = { ox: ox, oy: oy, s: s };
  }
  function applyPlaced(set) {
    var id = set.getAttribute('data-id'), lay = id && playout[id]; if (!set.querySelector('.nat') || set.classList.contains('mishka')) return;
    var any = !!(lay && Object.keys(lay).length);
    Array.prototype.forEach.call(set.querySelectorAll('.c'), function (c) { ['x', 'y', 'w'].forEach(function (k) { c.style.removeProperty('--' + k); }); if (any) { c.style.width = ''; c.style.height = ''; } });
    set.classList.toggle('placed', any);   /* the positions themselves are drawn by fitSheet → layoutPlaced */
  }
  function freeze(set) {   /* the pictures as they stand, in stage units */
    var id = set.getAttribute('data-id'), st = stageRect(set), s = st.width / 100, lay = playout[id] = {};
    Array.prototype.forEach.call(set.querySelectorAll('.c'), function (c) {
      var m = c.querySelector('img, video'), r = (m || c).getBoundingClientRect();
      lay[c.getAttribute('data-src')] = { x: (r.left - st.left) / s, y: (r.top - st.top) / s, w: r.width / s };
    });
    set.classList.add('placed'); layoutPlaced(set);
  }
  function rememberSet(set) {
    var id = set.getAttribute('data-id'), sg = id && stageOf[id]; if (!id || !sg) return; var lay = playout[id] = playout[id] || {};
    Array.prototype.forEach.call(set.querySelectorAll('.c'), function (c) {
      var r = c.getBoundingClientRect();
      lay[c.getAttribute('data-src')] = { x: (r.left - sg.ox) / sg.s, y: (r.top - sg.oy) / sg.s, w: r.width / sg.s };
    });
  }
  function savePlaced() {
    if (!placeDb) { note('NOT SAVED: CONNECT GITHUB IN THE HUB'); return; }
    note('…'); if (placeTimer) clearTimeout(placeTimer);
    placeTimer = setTimeout(function () { placeDb.doc('layout/' + pillar.id).set({ sets: playout, savedAt: new Date().toISOString() }).then(function () { note('PLACED · PUBLISH TO MAKE IT LIVE', true); }, function () { note('NOT SAVED'); }); }, 500);
  }
  function placeable(c, set) {
    var sx, sy, ox, oy, ow, moved = false, active = false, sizing = false, wasPlaced = false;
    c.addEventListener('pointerdown', function (e) {
      if (!placingOn() || e.button !== 0 || !window.matchMedia('(min-width: 901px)').matches) return;
      wasPlaced = set.classList.contains('placed'); if (!wasPlaced) freeze(set);
      var r = c.getBoundingClientRect();
      active = true; moved = false; sizing = !!e.target.closest('.grip');
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; ow = r.width;
      c.setPointerCapture(e.pointerId); c.classList.add('held'); e.preventDefault();
    });
    c.addEventListener('pointermove', function (e) {
      if (!active) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (sizing) c.style.setProperty('--w', Math.max(40, ow + dx).toFixed(1) + 'px');
      else { c.style.setProperty('--x', (ox + dx).toFixed(1) + 'px'); c.style.setProperty('--y', (oy + dy).toFixed(1) + 'px'); }
    });
    function drop(e) {
      if (!active) return; active = false; c.classList.remove('held'); try { c.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) { rememberSet(set); savePlaced(); fitSheet(); }
      else if (!wasPlaced) { delete playout[set.getAttribute('data-id')]; applyPlaced(set); fitSheet(); }
    }
    c.addEventListener('pointerup', drop); c.addEventListener('pointercancel', drop);
    c.addEventListener('click', function (e) { if (placingOn()) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  function setPlacing(on) {
    if (!(window.SITE_STORE && SITE_STORE.canWrite())) on = false;   /* placing: the writer only (a GitHub token in this browser, from the hub) */
    body.classList.toggle('placing', !!on);
    if (placeBtn) placeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    note(on ? 'DRAG A PICTURE TO PLACE IT · ITS CORNER TO SIZE IT' : '', !!on);
    try { localStorage.setItem('cb2-placing', on ? '1' : '0'); } catch (e) {}
  }
  var placeBtn = null;

  /* ZOOM: a click on a picture isolates it — blown up in the middle of the page, the only thing on it; the pictures of the project, the
     other names, the copy and the title step out. A click anywhere, or Esc, puts the page back. */
  var zoomEl = document.createElement('div'); zoomEl.className = 'zoom'; zoomEl.hidden = true; document.body.appendChild(zoomEl);
  function zoomFit() {
    if (zoomEl.hidden) return;
    var ed = edges(), top = line.getBoundingClientRect().bottom + 28, bottom = nav.getBoundingClientRect().top - 24;
    zoomEl.style.left = ed.inset + 'px'; zoomEl.style.right = ed.inset + 'px'; zoomEl.style.top = top + 'px'; zoomEl.style.height = Math.max(100, bottom - top) + 'px';
  }
  function zoomIn(el) {
    var m = el.tagName === 'VIDEO' ? document.createElement('video') : document.createElement('img');
    if (m.tagName === 'VIDEO') { m.src = el.getAttribute('src'); m.muted = true; m.autoplay = true; m.loop = true; m.playsInline = true; if (el.style.aspectRatio) m.style.aspectRatio = el.style.aspectRatio; m.addEventListener('click', function (e) { e.stopPropagation(); m.muted = !m.muted; }); }
    else { m.src = el.getAttribute('src'); m.alt = ''; m.draggable = false; }
    zoomEl.innerHTML = ''; zoomEl.appendChild(m); zoomEl.hidden = false; body.classList.add('zoomed'); zoomFit();
    if (m.tagName === 'VIDEO') { var pr = m.play(); if (pr && pr.catch) pr.catch(function () {}); }
  }
  function zoomOut() { if (zoomEl.hidden) return; zoomEl.hidden = true; zoomEl.innerHTML = ''; body.classList.remove('zoomed'); }
  var setsEl = document.getElementById('sets');
  if (setsEl) {
    setsEl.addEventListener('click', function (e) {
      var m = e.target.closest('.c img, .c video'); if (!m || body.classList.contains('zoomed') || placingOn() || !window.matchMedia('(min-width: 901px)').matches) return;   /* no zoom on the phone: the strip swipes */
      e.preventDefault(); e.stopPropagation(); zoomIn(m);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zoomOut(); });
    document.addEventListener('click', function (e) { if (!body.classList.contains('zoomed')) return; if (e.target.closest('.mark, .pillars, .switch, .about, .doors')) return; zoomOut(); });
    window.addEventListener('resize', zoomFit);
  }
  function show(i) {
    currentId = entries[i] ? entries[i].id : null;
    rows.forEach(function (r, k) { r.classList.toggle('on', k === i); });
    sets.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    txts.forEach(function (t, k) { t.classList.toggle('on', k === i); });
    fitSheet();
  }
  function media(m) { return (m.v ? '<video src="' + m.src + '"' + (m.ar ? ' style="aspect-ratio:' + m.ar + '"' : '') + ' muted autoplay loop playsinline></video>' : '<img src="' + m.src + '" alt="" draggable="false">') + '<span class="grip" aria-hidden="true"></span>'; }
  var offsets = [0, 2, -1.5, 1, -2.5, 1.5, -1, 2.5, 0.5, -2];   /* the cells of a grid sit a touch up or down, in turn */
  function deal(imgs, cols) {   /* rows of so many */
    var rows = [], row = [];
    imgs.forEach(function (m) { if (row.length >= cols) { rows.push(row); row = []; } row.push(m); });
    if (row.length) rows.push(row); return rows;
  }
  function render() {
  line.innerHTML = entries.map(function (p, i) {
    return '<li' + (i === 0 ? ' class="on"' : '') + '><a href="#' + p.id + '"><span class="name' + (p.lc ? ' keep' : '') + '">' + p.name + '</span></a></li>';
  }).join('');
  /* the row of pictures, and directly under it the entry's terms in the brackets of the section nav */
  document.getElementById('sets').innerHTML = entries.map(function (p, i) {
    var meta = (p.meta || '').split(/\s*·\s*/).filter(Boolean).map(function (t) { return '<span><span class="b">[</span> ' + t.toUpperCase() + ' <span class="b">]</span></span>'; }).join('');
    var real = p.imgs.filter(function (m) { return !m.ph; });
    /* Mishka: the film twice, left and right, and the logo turning between them */
    if (p.layout === 'mishka') {
      var model = real.filter(function (m) { return m.model; })[0], logo = real.filter(function (m) { return m.logo; })[0], film = real.filter(function (m) { return m.v; })[0];
      var side = film ? '<video class="side" src="' + film.src + '" muted autoplay loop playsinline preload="metadata"' + (film.ar ? ' style="aspect-ratio:' + film.ar + '"' : '') + '></video>' : '';
      var centre = model ? '<canvas class="model" data-src="' + model.src + '" data-fill="0.62" aria-label="Mishka"></canvas>' + (model.poster ? '<img class="flat" src="' + model.poster + '" alt="Mishka" hidden>' : '') : (logo ? '<img src="' + logo.src + '" alt="Mishka">' : '');
      return '<div class="set mishka' + (i === 0 ? ' on' : '') + '" data-n="' + real.length + '"><div class="trio">' + side + '<div class="spin">' + centre + '</div>' + side + '</div><p class="meta">' + meta + '</p></div>';
    }
    /* nothing to show yet: a line in the middle of the band instead of the row */
    if (!real.length) return '<div class="set soon' + (i === 0 ? ' on' : '') + '" data-n="0"><p class="soonline"><span class="b">[</span> INFO COMING SOON <span class="b">]</span></p></div>';
    /* a column count from the media hub: the pictures in rows of that many (the hub's rows, or dealt here), a video two columns wide,
       the cells a little offset; a row holding more than fits shrinks to fit */
    if (p.cols > 0) {
      var rows = p.rows && p.rows.length ? p.rows : deal(real, p.cols), j = 0;
      return '<div class="set' + (i === 0 ? ' on' : '') + '" data-id="' + p.id + '" data-n="' + real.length + '"><div class="nat grid" style="--cols:' + p.cols + '">' + rows.map(function (row) {
        return '<div class="row">' + row.map(function (m) { return '<div class="c" data-src="' + m.src + '" style="--oy:' + offsets[(j++) % offsets.length] + '%">' + media(m) + '</div>'; }).join('') + '</div>';
      }).join('') + '</div><p class="meta">' + meta + '</p></div>';
    }
    return '<div class="set' + (i === 0 ? ' on' : '') + '" data-id="' + p.id + '" data-n="' + real.length + '"><div class="nat">' + real.slice().reverse().map(function (m) { return '<div class="c" data-src="' + m.src + '">' + media(m) + '</div>'; }).join('') + '</div><p class="meta">' + meta + '</p></div>';
  }).join('');
  /* the copy: right-aligned, floating above the bottom corner */
  document.getElementById('txts').innerHTML = entries.map(function (p, i) {
    var ph = p.ph ? ' ph' : '';
    var keep = function (t) { return (t || '').replace(/enc0re/gi, '<span class="keep">enc0re</span>'); };   /* the name keeps its case inside caps copy */
    return '<div class="txt' + (i === 0 ? ' on' : '') + '"><p class="copy' + ph + '">' + keep(p.copy) + '</p><ul class="bul' + ph + '">' + (p.bul || []).map(function (b) { return '<li>' + keep(b) + '</li>'; }).join('') + '</ul></div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#sets img, #sets video'), function (el) { el.addEventListener(el.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', fitSheet); });
  rows = Array.prototype.slice.call(document.querySelectorAll('#line li'));
  sets = Array.prototype.slice.call(document.querySelectorAll('#sets .set'));
  sets.forEach(function (set) { applyPlaced(set); Array.prototype.forEach.call(set.querySelectorAll('.c'), function (c) { placeable(c, set); }); });
  txts = Array.prototype.slice.call(document.querySelectorAll('#txts .txt'));
  /* only the letters of a name answer the pointer — the white space around them does nothing */
  rows.forEach(function (r, i) {
    var word = r.querySelector('.name') || r.querySelector('a');
    word.addEventListener('pointerenter', function () { if (!body.classList.contains('zoomed')) show(i); });
    r.querySelector('a').addEventListener('focus', function () { if (!body.classList.contains('zoomed')) show(i); });
    r.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); show(i); });
  });
  /* open on the entry that was open, else the first that has real pictures */
  var first = -1; entries.some(function (p, i) { if (p.id === currentId) { first = i; return true; } });
  if (first < 0) entries.some(function (p, i) { if (p.imgs.some(function (m) { return !m.ph; })) { first = i; return true; } });
  show(Math.max(0, first));
  if (window.mishka3d) window.mishka3d();
  }
  if (!isPhoto) render();

  /* the sort tool's arrangement for this section (sort/<id> in the database): the order of the projects, each one's pictures in order,
     and its column count. Pictures added to the site since the last save join the end of their project. */
  var every = {}; S.projects.forEach(function (p) { p.imgs.forEach(function (m) { if (m.src && !m.ph) every[m.src] = m; }); }); S.photo.forEach(function (c) { c.groups.forEach(function (g) { g.imgs.forEach(function (m) { every[m.src] = m; }); }); });
  var gone = {};   /* pictures removed from the site in the media hub (sort/removed) */
  function dropGone() { entries.forEach(function (e) { if (!e.layout) e.imgs = e.imgs.filter(function (m) { return !gone[m.src]; }); }); }
  function applySaved(v) {
    var cat = v && v.cats && v.cats[0]; if (!cat || !cat.groups) return;
    var known = v.known || null, byId = {}; entries.forEach(function (e) { byId[e.id] = e; });
    var out = [];
    cat.groups.forEach(function (g) {
      var e = g.id && byId[g.id]; if (!e) return;
      var imgs;
      if (e.layout) imgs = e.imgs;   /* a laid-out project (Mishka) keeps its own pieces */
      else {
        imgs = (g.imgs || []).map(function (src) { return every[src]; }).filter(Boolean);
        e.imgs.forEach(function (m) { if (!m.ph && (g.imgs || []).indexOf(m.src) === -1 && (!known || known.indexOf(m.src) === -1)) imgs.push(m); });
      }
      imgs = imgs.filter(function (m) { return !gone[m.src]; });
      var copy = {}; for (var k in e) copy[k] = e[k]; copy.imgs = imgs; copy.cols = g.cols || 0; if (g.name) copy.name = g.name;
      if (g.cols && g.frames && !e.layout) {   /* the hub's rows; a picture it does not place (added since) gets a row of its own at the end */
        var placed = {}, rows = g.frames.map(function (f) { return f.map(function (src) { placed[src] = 1; return every[src]; }).filter(function (m) { return m && !gone[m.src]; }); }).filter(function (r) { return r.length; });
        var rest = imgs.filter(function (m) { return !placed[m.src]; }); if (rest.length) rows.push(rest);
        copy.rows = rows;
      }
      out.push(copy);
    });
    entries.forEach(function (e) { if (!cat.groups.some(function (g) { return g.id === e.id; })) out.push(e); });
    entries = out; render(); alignTop();
  }
  if (!isPhoto && window.SITE_DB) SITE_DB.then(function (db) {
    if (!db) return;
    placeDb = db;
    return Promise.all([db.doc('sort/' + pillar.id).get(), db.doc('sort/removed').get(), db.doc('layout/' + pillar.id).get()]).then(function (r) {
      var rv = r[1].exists ? r[1].data() : null; (rv && rv.srcs || []).forEach(function (s) { gone[s] = 1; });
      var lv = r[2].exists ? r[2].data() : null; if (lv && lv.sets) playout = lv.sets;
      if (r[0].exists) applySaved(r[0].data()); else { dropGone(); render(); alignTop(); }
    });
  }).catch(function () {});

  /* review switcher: each button sets one attribute on <body> (its group) to its value; keys press the matching button. The SHEET slider
     sets data-sheetw. The structure (I / K) is shared with home. Folded to [ REVIEW ] until opened. */
  var strip = document.querySelector('.switch');
  if (strip) {
    var tog = document.createElement('button'); tog.type = 'button'; tog.className = 'toggle'; tog.innerHTML = '<span class="b">[</span> REVIEW <span class="b">]</span>';
    strip.insertBefore(tog, strip.firstChild);
    var openSaved = null; try { openSaved = localStorage.getItem('cb2-strip'); } catch (e) {}
    strip.classList.toggle('min', openSaved !== 'open');
    tog.addEventListener('click', function () { strip.classList.toggle('min'); try { localStorage.setItem('cb2-strip', strip.classList.contains('min') ? 'min' : 'open'); } catch (e) {} });
  }
  /* the placing tool's controls, once the strip exists */
  if (strip && !isPhoto) {
    placeBtn = document.createElement('button'); placeBtn.type = 'button'; placeBtn.textContent = 'PLACE'; placeBtn.setAttribute('data-key', 'P');
    placeBtn.addEventListener('click', function () { setPlacing(!placingOn()); });
    placeNote = document.createElement('span'); placeNote.className = 'tool';
    var resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.textContent = 'RESET PROJECT';
    resetBtn.addEventListener('click', function () { var set = document.querySelector('.set.on'); if (!set) return; delete playout[set.getAttribute('data-id')]; applyPlaced(set); fitSheet(); savePlaced(); note('PROJECT RESET', true); });
    var sep = document.createElement('span'); sep.className = 'sep';
    var tool = strip.querySelector('.tool'); [placeBtn, placeNote, resetBtn, sep].forEach(function (el) { strip.insertBefore(el, tool); });
    document.addEventListener('keydown', function (e) { if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; if (e.key === 'p' || e.key === 'P') setPlacing(!placingOn()); });
    var wantPlace = location.hash === '#place'; if (!wantPlace) { try { wantPlace = localStorage.getItem('cb2-placing') === '1'; } catch (e) {} }
    if (wantPlace) { setPlacing(true); if (location.hash === '#place') { strip.classList.remove('min'); } }
  }
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.switch button[data-group]'));
  function keyFor(group) { return 'cb2-' + group; }
  function setGroup(group, value) {
    body.setAttribute('data-' + group, value);
    buttons.forEach(function (b) { if (b.getAttribute('data-group') === group) b.setAttribute('aria-pressed', b.getAttribute('data-value') === value ? 'true' : 'false'); });
    try { localStorage.setItem(keyFor(group), value); } catch (e) {}
    if (group === 'copy') alignTop();
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { setGroup(b.getAttribute('data-group'), b.getAttribute('data-value')); }); });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'INPUT') return;
    var k = e.key.toUpperCase();
    buttons.forEach(function (b) { if (b.getAttribute('data-key') === k) setGroup(b.getAttribute('data-group'), b.getAttribute('data-value')); });
  });
  ['copy', 'titles', 'layout'].forEach(function (group) {
    var saved = null; try { saved = localStorage.getItem(keyFor(group)); } catch (e) {}
    var ok = buttons.filter(function (b) { return b.getAttribute('data-group') === group; });
    if (!ok.length) return;
    var preset = body.getAttribute('data-' + group);
    var hit = ok.filter(function (b) { return b.getAttribute('data-value') === saved; })[0] || ok.filter(function (b) { return b.getAttribute('data-value') === preset; })[0] || ok[0];
    setGroup(group, hit.getAttribute('data-value'));
  });

  alignTop();
})();
