/* About overlay. Needs SITE.about from data.js and an element with data-about (the name) to toggle it.
   Two doors open inside the sheet: CAMERA ROLL (one picture at a time, dead centre, cutting on a timer; the pictures come from the sort
   tool's Camera Roll tab, kept in the artifact's database and asset store) and INSPIRATIONS (a wall to the right of the words: one row per
   Are.na board, square cells edge to edge, pulled live from Are.na in the visitor's browser). */
(function () {
  var S = window.SITE; if (!S || !S.about) return;
  var ov = document.createElement('div');
  ov.className = 'about'; ov.id = 'about'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'About'); ov.hidden = true;
  ov.innerHTML = '<div class="about-col">' + S.about.paras.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</div>' +
    (S.about.portrait ? '<img class="about-portrait" src="' + S.about.portrait + '" alt="Cameron Bunge" draggable="false">' : '') +
    '<div class="about-contact">' + S.about.contact.map(function (c) { return c.href ? '<a href="' + c.href + '"' + (c.href.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '') + '>' + c.t + '</a>' : '<span>' + c.t + '</span>'; }).join('<br>') + '</div>' +
    '<button class="about-close" type="button"><span class="b">[</span> CLOSE <span class="b">]</span></button>';
  document.body.appendChild(ov);
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-about]'));
  function open() { ov.hidden = false; document.body.classList.add('about-open'); toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'true'); }); wallLoad(); camLoadBoard(); }
  function close() { ov.hidden = true; document.body.classList.remove('about-open'); toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); }); camStop(); wallStop(); }
  toggles.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); t.addEventListener('click', function (e) { e.preventDefault(); ov.hidden ? open() : close(); }); });
  ov.querySelector('.about-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !ov.hidden) close(); });

  /* ---- CAMERA ROLL ---- */
  var cam = S.about.cameraRoll || { every: 600, imgs: [] }, camEl = document.createElement('div'), camImg = document.createElement('img'), camTimer = null, camAt = 0;
  camEl.className = 'about-cam'; camEl.hidden = true; camEl.setAttribute('aria-label', 'Camera roll');
  camImg.alt = ''; camImg.draggable = false; camEl.appendChild(camImg);
  var camNote = document.createElement('p'); camNote.className = 'about-camnote'; camNote.innerHTML = '<span class="b">[</span> NOTHING IN THE CAMERA ROLL YET <span class="b">]</span>'; camEl.appendChild(camNote);
  ov.appendChild(camEl);
  var camSrcs = (cam.imgs || []).map(function (m) { return typeof m === 'string' ? m : m.src; }), camFromBoard = false;
  /* the roll's source of truth is an Are.na channel (cam.arena): every picture on it, newest first. Where Are.na can't be reached the
     drop-box pictures (sort/camera) stand in. */
  function camLoadBoard() {
    if (!cam.arena || camFromBoard) return;
    fetch('https://api.are.na/v2/channels/' + encodeURIComponent(cam.arena) + '?per=100&sort=position&direction=desc')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var list = (j.contents || []).map(function (b) { var im = b.image; return im && ((im.large && im.large.url) || (im.display && im.display.url) || (im.original && im.original.url)); }).filter(Boolean);
        if (!list.length) return;
        camFromBoard = true; camSrcs = list;
        if (document.body.classList.contains('cam-open')) camStart();
      }).catch(function () {});
  }
  function camShow() { if (!camSrcs.length) return; camImg.src = camSrcs[camAt % camSrcs.length]; }
  function camStart() {
    if (ov.hidden) open();
    wallStop();
    document.body.classList.add('cam-open'); camEl.hidden = false; camNote.hidden = !!camSrcs.length;
    camSrcs.forEach(function (s) { var i = new Image(); i.src = s; });
    camAt = 0; camShow(); if (camTimer) clearInterval(camTimer);
    if (camSrcs.length > 1) camTimer = setInterval(function () { camAt = (camAt + 1) % camSrcs.length; camShow(); }, cam.every || 600);
    doorsMark();
  }
  function camStop() {
    if (camTimer) clearInterval(camTimer); camTimer = null;
    document.body.classList.remove('cam-open'); camEl.hidden = true; doorsMark();
  }

  /* ---- INSPIRATIONS: the wall ---- */
  var boards = S.arena || [], wallEl = document.createElement('div'), wallLoaded = false, seen = {};
  wallEl.className = 'about-wall'; wallEl.hidden = true; wallEl.setAttribute('aria-label', 'Inspirations');
  wallEl.innerHTML = boards.map(function (slug) { return '<div class="row" data-slug="' + slug + '"><span class="lbl"></span><div class="cells"></div></div>'; }).join('') || '<p class="about-camnote"><span class="b">[</span> NO BOARDS YET <span class="b">]</span></p>';
  ov.appendChild(wallEl);
  /* the board's name in the corner of its row — Are.na's title once it answers; the slug, de-hyphenated and without its id tail, until then */
  function label(slug, title) {
    var row = wallEl.querySelector('.row[data-slug="' + slug + '"]'), el = row && row.querySelector('.lbl'); if (!el) return;
    var t = title ? String(title).trim() : slug.replace(/-[a-z0-9]{10,}$/, '').replace(/-/g, ' ');
    el.textContent = t; if (row && title) row.setAttribute('data-title', t);
  }
  boards.forEach(function (slug) { label(slug, null); });
  function cell(block, slug) {
    var im = block.image; if (!im) return;
    var src = (im.display && im.display.url) || (im.large && im.large.url) || (im.original && im.original.url); if (!src || seen[src]) return;
    seen[src] = 1;
    var a = document.createElement('a'); a.href = block.source && block.source.url ? block.source.url : ('https://www.are.na/block/' + block.id); a.target = '_blank'; a.rel = 'noopener'; a.title = block.title || '';
    var img = document.createElement('img'); img.src = (im.square && im.square.url) || (im.thumb && im.thumb.url) || src; img.loading = 'lazy'; img.alt = block.title || ''; img.draggable = false;
    a.appendChild(img);
    var row = wallEl.querySelector('.row[data-slug="' + slug + '"] .cells'); if (row) row.appendChild(a);
  }
  function wallFetch(slug, page) {
    return fetch('https://api.are.na/v2/channels/' + encodeURIComponent(slug) + '?per=100&page=' + page + '&sort=position&direction=desc')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (j.title) label(slug, j.title);
        (j.contents || []).forEach(function (b) { cell(b, slug); });
        /* every page of the board, so the row holds everything saved on it, not only the newest hundred (10/12) */
        if ((j.contents || []).length === 100 && page < 20) return wallFetch(slug, page + 1);
      })
      .catch(function () { var row = wallEl.querySelector('.row[data-slug="' + slug + '"]'); if (row && !row.querySelector('a')) row.classList.add('off'); });
  }
  function wallLoad() { if (wallLoaded || !boards.length) return; wallLoaded = true; boards.forEach(function (slug) { wallFetch(slug, 1); }); }
  function wallFit() {
    /* the wall starts where the words end and under the name: measured, so it holds at any width */
    var col = ov.querySelector('.about-col'), mark = document.querySelector('.mark');
    if (col) wallEl.style.left = Math.round(col.getBoundingClientRect().right + 48) + 'px';
    if (mark) wallEl.style.top = Math.round(mark.getBoundingClientRect().bottom + 8) + 'px';
  }
  function wallStart() {
    if (ov.hidden) open();
    camStop(); wallLoad(); wallFit();
    document.body.classList.add('wall-open'); wallEl.hidden = false; doorsMark();
  }
  function wallStop() { document.body.classList.remove('wall-open'); wallEl.hidden = true; doorsMark(); }
  window.addEventListener('resize', function () { if (!wallEl.hidden) wallFit(); });
  /* a row scrolls sideways under the wheel, so the whole board is reachable without leaving the sheet */
  wallEl.addEventListener('wheel', function (e) {
    var row = e.target.closest('.cells'); if (!row) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { row.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });
  /* and a row pans under a held mouse — click and drag to scroll (10/12); a real drag swallows the click so no block opens by accident */
  (function () {
    var held = null, x0 = 0, s0 = 0, moved = false;
    wallEl.addEventListener('pointerdown', function (e) {
      var row = e.target.closest('.cells'); if (!row || e.button !== 0) return;
      held = row; x0 = e.clientX; s0 = row.scrollLeft; moved = false;
    });
    wallEl.addEventListener('pointermove', function (e) {
      if (!held) return;
      var dx = e.clientX - x0;
      /* the pointer is captured only once it is a drag, so a plain click still lands on the block and opens it */
      if (!moved && Math.abs(dx) > 4) { moved = true; held.classList.add('held'); try { held.setPointerCapture(e.pointerId); } catch (x) {} }
      if (moved) { held.scrollLeft = s0 - dx; e.preventDefault(); }
    });
    function drop(e) {
      if (!held) return;
      var row = held; held = null;
      try { row.releasePointerCapture(e.pointerId); } catch (x) {}
      if (moved) setTimeout(function () { row.classList.remove('held'); }, 0);
    }
    wallEl.addEventListener('pointerup', drop); wallEl.addEventListener('pointercancel', drop);
    wallEl.addEventListener('click', function (e) { if (moved && e.target.closest('.cells')) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    wallEl.addEventListener('dragstart', function (e) { if (e.target.closest('.cells')) e.preventDefault(); });
  })();

  /* ---- the doors — INSPIRATIONS and CAMERA ROLL (locked 10/11): on home they hold the bottom-left corner, stacked; on the bio sheet they sit in
     the middle of the page, and step up to the top while a door is open. Nowhere else. ---- */
  function doorsMark() {
    Array.prototype.forEach.call(document.querySelectorAll('.doors a'), function (a) {
      var h = a.getAttribute('href');
      a.classList.toggle('on', (h === '#camera-roll' && document.body.classList.contains('cam-open')) || (h === '#inspirations' && document.body.classList.contains('wall-open')));
    });
  }
  if (S.about.links && S.about.links.length) {
    var doors = document.createElement('nav'); doors.className = 'doors'; doors.setAttribute('aria-label', 'Inspirations and camera roll');
    doors.innerHTML = S.about.links.map(function (l) { return '<a href="' + l.href + '"' + (l.href.indexOf('http') === 0 ? ' target="_blank" rel="noopener"' : '') + '><span class="b">[</span> ' + l.t + ' <span class="b">]</span></a>'; }).join('');
    document.body.appendChild(doors);
    var camLink = doors.querySelector('a[href="#camera-roll"]'), wallLink = doors.querySelector('a[href="#inspirations"]');
    if (camLink) camLink.addEventListener('click', function (e) { e.preventDefault(); if (document.body.classList.contains('cam-open')) camStop(); else camStart(); });
    if (wallLink) wallLink.addEventListener('click', function (e) { e.preventDefault(); if (document.body.classList.contains('wall-open')) wallStop(); else wallStart(); });
  }
  if (location.hash === '#about') open();
  if (location.hash === '#camera-roll') camStart();
  if (location.hash === '#inspirations') wallStart();

  /* the camera roll's pictures: the sort tool's Camera Roll tab keeps them in the database (sort/camera) and the asset store; read here */
  window.claude && claude.use('db').then(function (db) {
    if (!db) return;
    return db.doc('sort/camera').get().then(function (snap) {
      var v = snap.exists ? snap.data() : null; if (!v || !v.imgs || !v.imgs.length || camFromBoard) return;
      camSrcs = v.imgs.map(function (m) { return m.id ? '/_blob/' + m.id : m.src; }).filter(Boolean);
      if (typeof v.every === 'number' && v.every > 0) cam.every = v.every;
      if (document.body.classList.contains('cam-open')) camStart();
    });
  }).catch(function () {});
})();
