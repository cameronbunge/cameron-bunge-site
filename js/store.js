/* THE STORE — one source of truth for the site's content: the GitHub repository the site is served from.

   READ.  js/content.js (window.SITE_CONTENT, loaded just before this) carries everything the hub manages — the words, the projects and
   their pictures, the photo categories, the bio, the Are.na boards — and the arrangements made in the hub and with the placing tools (the
   documents the pages read: sort/<section>, layout/<section>). It is laid over SITE here, so the pages read it as they always have.
   WRITE. With a GitHub token kept in this browser (the hub's CONNECT), changes collect in memory — and in this browser, so a closed tab
   loses nothing — and go up as ONE commit with PUBLISH: js/content.js plus any pictures added or purged. GitHub Pages serves the new
   version within a minute or so. Without a token the site is read-only; the review controls stay hidden. */
(function () {
  var S = window.SITE; if (!S) return;
  var REPO = 'cameronbunge/cameron-bunge-site', BRANCH = 'main', API = 'https://api.github.com', KEY = 'cb-gh-token', PEND = 'cb-pending';
  var C = window.SITE_CONTENT || null, loadedAt = C && C.savedAt || '';
  var listeners = [], changes = [], files = {}, urls = {}, status = { t: '', on: false, busy: false };

  /* ---- the content over SITE ---- */
  function overlay() {
    ['about', 'arena', 'projects', 'photo', 'home', 'homeHover'].forEach(function (k) { if (C[k] !== undefined) S[k] = C[k]; });
    /* the fixed words: content over the site's defaults, field by field, and the section names onto the sections */
    var site = S.site || (S.site = {}); if (C.site) Object.keys(C.site).forEach(function (k) { site[k] = C.site[k]; }); C.site = site;
    var names = site.sections || {}; [S.pillars].concat(Object.keys(S.structures || {}).map(function (k) { return S.structures[k].pillars; })).forEach(function (list) { (list || []).forEach(function (p) { if (names[p.id]) p.name = names[p.id]; }); });
    C.state = C.state || {};
  }
  function fromSite() {   /* no content.js yet: the site's own data is the content */
    return { v: 1, savedAt: '', about: S.about, arena: S.arena, projects: S.projects, photo: S.photo, home: S.home, homeHover: S.homeHover, site: S.site, state: {} };
  }
  /* the fixed words onto the page: the name top-right, the city under it, the lines on the home page */
  function words() {
    var site = S.site || {}, h1 = document.querySelector('.mark h1'), city = document.querySelector('.mark .under .city'), col = document.querySelector('.bioCol');
    var escape = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    if (h1 && site.nameLines && site.nameLines.length) h1.innerHTML = site.nameLines.map(escape).join('<br>');
    if (city && site.city != null) city.textContent = site.city;
    if (col && site.homeLines) col.innerHTML = site.homeLines.map(function (l) { return '<p class="bio">' + escape(l) + '</p>'; }).join('');
    if (site.nameLines && site.nameLines.length && /^(index\.html)?$/.test(location.pathname.split('/').pop())) document.title = site.nameLines.join(' ');
  }
  if (!C) C = fromSite();
  /* unpublished changes left in this browser come back, as long as nothing was published in between */
  var pending = null; try { pending = JSON.parse(localStorage.getItem(PEND) || 'null'); } catch (e) {}
  if (pending && pending.content && pending.base === loadedAt) { C = pending.content; changes = pending.changes || ['UNPUBLISHED CHANGES']; }
  else if (pending) { try { localStorage.removeItem(PEND); } catch (e) {} pending = null; }
  overlay(); words();

  /* ---- the token ---- */
  function token() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(KEY, t.trim()); else localStorage.removeItem(KEY); } catch (e) {} mark(); }
  function canWrite() { return !!token(); }
  function mark() { document.documentElement.classList.toggle('editor', canWrite() || !!window.claude); document.documentElement.classList.toggle('writer', canWrite()); }
  mark();

  /* ---- changes ---- */
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  var persistTimer = null;
  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      try { if (changes.length) localStorage.setItem(PEND, JSON.stringify({ base: loadedAt, content: C, changes: changes, at: new Date().toISOString() })); else localStorage.removeItem(PEND); } catch (e) {}
    }, 250);
  }
  function touch(label) { if (label && changes.indexOf(label) === -1) changes.push(label); persist(); emit(); }
  function get(path) { return C.state[path] || null; }
  function set(path, data, label) { C.state[path] = data; touch(label || ('ARRANGED ' + path.split('/')[1].toUpperCase())); return Promise.resolve(); }

  /* the pages read documents through this, as they did from the artifact's database */
  window.SITE_DB = Promise.resolve({ doc: function (path) { return {
    get: function () { var d = get(path); return Promise.resolve({ exists: !!d, data: function () { return d; } }); },
    set: function (data) { return set(path, data); }
  }; } });

  /* ---- files added (kept in this browser until published) or purged ---- */
  var idb = {
    open: function () { return new Promise(function (res, rej) { if (idb.db) return res(idb.db); if (!window.indexedDB) return rej(new Error('no idb')); var r = indexedDB.open('cb-hub', 1); r.onupgradeneeded = function () { r.result.createObjectStore('files'); }; r.onsuccess = function () { idb.db = r.result; res(idb.db); }; r.onerror = function () { rej(r.error); }; }); },
    put: function (k, v) { return idb.open().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('files', 'readwrite'); t.objectStore('files').put(v, k); t.oncomplete = res; t.onerror = function () { rej(t.error); }; }); }).catch(function () {}); },
    del: function (k) { return idb.open().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('files', 'readwrite'); t.objectStore('files').delete(k); t.oncomplete = res; t.onerror = function () { rej(t.error); }; }); }).catch(function () {}); },
    all: function () { return idb.open().then(function (d) { return new Promise(function (res, rej) { var out = {}, t = d.transaction('files', 'readonly'), st = t.objectStore('files'), c = st.openCursor(); c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; c.onerror = function () { rej(c.error); }; }); }).catch(function () { return {}; }); },
    clear: function () { return idb.open().then(function (d) { return new Promise(function (res) { var t = d.transaction('files', 'readwrite'); t.objectStore('files').clear(); t.oncomplete = res; t.onerror = res; }); }).catch(function () {}); }
  };
  function stage(path, blob, label) { files[path] = blob; if (urls[path]) URL.revokeObjectURL(urls[path]); urls[path] = URL.createObjectURL(blob); idb.put(path, blob); touch(label); }
  function unstage(path) { if (files[path] === undefined) return; delete files[path]; if (urls[path]) { URL.revokeObjectURL(urls[path]); delete urls[path]; } idb.del(path); touch(); }
  function purge(path, label) { files[path] = null; idb.put(path, null); touch(label); }
  function urlOf(path) { return urls[path] || null; }
  function staged() { return Object.keys(files); }
  var ready = idb.all().then(function (saved) {
    var keep = !!pending;   /* with the pending content gone, the files it referred to go too */
    Object.keys(saved).forEach(function (p) {
      if (!keep) { idb.del(p); return; }
      if (saved[p] === null) files[p] = null; else { files[p] = saved[p]; urls[p] = URL.createObjectURL(saved[p]); }
    });
    emit();
  });

  /* ---- GitHub ---- */
  function gh(method, path, body) {
    return fetch(API + path, { method: method, cache: 'no-store', headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.text().then(function (t) { var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {} if (!r.ok) { var err = new Error((j && j.message) || ('HTTP ' + r.status)); err.status = r.status; throw err; } return j; }); });
  }
  function b64(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1] || ''); }; fr.onerror = function () { rej(fr.error); }; fr.readAsDataURL(blob); }); }
  function verify() {
    if (!token()) return Promise.reject(new Error('NO TOKEN'));
    return gh('GET', '/repos/' + REPO).then(function (j) { if (!(j.permissions && j.permissions.push)) throw new Error('THE TOKEN CAN READ THE SITE BUT NOT WRITE IT — IT NEEDS CONTENTS: READ AND WRITE'); return { repo: j.full_name, push: true }; });
  }
  function tree() {   /* every path in the repository right now */
    return gh('GET', '/repos/' + REPO + '/git/ref/heads/' + BRANCH).then(function (ref) { return gh('GET', '/repos/' + REPO + '/git/trees/' + ref.object.sha + '?recursive=1'); })
      .then(function (t) { var out = {}; (t.tree || []).forEach(function (e) { if (e.type === 'blob') out[e.path] = e.sha; }); return out; });
  }
  function serialize(at) { C.savedAt = at; return '/* THE SITE\'S CONTENT — written by the hub (hub.html). Edit there, not here: the next PUBLISH overwrites this file. */\nwindow.SITE_CONTENT = ' + JSON.stringify(C, null, 1) + ';\n'; }
  function note(t, on, busy) { status = { t: t, on: !!on, busy: !!busy }; emit(); }
  /* one commit: the content, every file added, every file purged (only those the repository still has) */
  function publish(message) {
    if (!token()) return Promise.reject(new Error('NOT CONNECTED'));
    if (status.busy) return Promise.reject(new Error('BUSY'));
    var at = new Date().toISOString(), head, baseTree, entries = [], have = {}, paths = Object.keys(files);
    var text = serialize(at), msg = message || ('Hub: ' + (changes.length ? changes.join(', ').toLowerCase() : 'publish'));
    note('PUBLISHING…', false, true);
    return gh('GET', '/repos/' + REPO + '/git/ref/heads/' + BRANCH).then(function (ref) { head = ref.object.sha; return gh('GET', '/repos/' + REPO + '/git/trees/' + head + '?recursive=1'); })
      .then(function (t) { baseTree = t.sha; (t.tree || []).forEach(function (e) { if (e.type === 'blob') have[e.path] = 1; });
        var chain = Promise.resolve(), n = 0;
        paths.forEach(function (p) { chain = chain.then(function () {
          var v = files[p]; n++;
          if (v === null) { if (have[p]) entries.push({ path: p, mode: '100644', type: 'blob', sha: null }); return; }
          note('UPLOADING ' + n + ' / ' + paths.length + ' · ' + p.split('/').pop().toUpperCase(), false, true);
          return b64(v).then(function (content) { return gh('POST', '/repos/' + REPO + '/git/blobs', { content: content, encoding: 'base64' }); }).then(function (b) { entries.push({ path: p, mode: '100644', type: 'blob', sha: b.sha }); });
        }); });
        return chain; })
      .then(function () { note('COMMITTING…', false, true); return b64(new Blob([text], { type: 'text/plain' })); })
      .then(function (content) { return gh('POST', '/repos/' + REPO + '/git/blobs', { content: content, encoding: 'base64' }); })
      .then(function (b) { entries.push({ path: 'js/content.js', mode: '100644', type: 'blob', sha: b.sha }); return gh('POST', '/repos/' + REPO + '/git/trees', { base_tree: baseTree, tree: entries }); })
      .then(function (t) { return gh('POST', '/repos/' + REPO + '/git/commits', { message: msg, tree: t.sha, parents: [head] }); })
      .then(function (c) { return gh('PATCH', '/repos/' + REPO + '/git/refs/heads/' + BRANCH, { sha: c.sha }).then(function () { return c; }); })
      .then(function (c) {
        /* published: nothing pending any more; the pictures added are on their way, their browser copies stay until the site has them */
        loadedAt = at; changes = []; try { localStorage.removeItem(PEND); } catch (e) {}
        Object.keys(files).forEach(function (p) { if (files[p] === null) { delete files[p]; } });
        idb.clear(); var keepUrls = urls; files = {}; urls = keepUrls;
        note('PUBLISHED · WAITING FOR THE SITE…', true, false);
        return waitLive(at).then(function (ok) { note(ok ? 'LIVE ' + new Date(at).toLocaleTimeString() : 'PUBLISHED — THE SITE IS TAKING A WHILE; REFRESH IN A MINUTE', true, false); return c; });
      })
      .catch(function (e) { note('NOT PUBLISHED: ' + (e && e.message || 'error').toUpperCase(), false, false); throw e; });
  }
  function waitLive(at) {
    var tries = 0;
    return new Promise(function (res) {
      (function poll() {
        tries++;
        fetch('js/content.js?v=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
          if (t.indexOf('"savedAt": "' + at + '"') !== -1 || t.indexOf('"savedAt":"' + at + '"') !== -1) return res(true);
          if (tries > 24) return res(false); setTimeout(poll, 8000);
        }).catch(function () { if (tries > 24) res(false); else setTimeout(poll, 8000); });
      })();
    });
  }

  window.SITE_STORE = { content: function () { return C; }, repo: REPO, token: token, setToken: setToken, canWrite: canWrite, verify: verify, tree: tree,
    get: get, set: set, touch: touch, changes: function () { return changes.slice(); }, dirty: function () { return changes.length > 0 || Object.keys(files).length > 0; },
    stage: stage, unstage: unstage, purge: purge, urlOf: urlOf, staged: staged, fileOf: function (p) { return files[p]; }, ready: ready,
    publish: publish, status: function () { return status; }, onChange: function (f) { listeners.push(f); }, loadedAt: function () { return loadedAt; }, words: words };

  /* ---- the review strip: a PUBLISH button on every page for the writer, visible even with the strip folded ---- */
  function strip() {
    var el = document.querySelector('.switch'); if (!el || !canWrite()) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'toggle pub';
    var st = document.createElement('span'); st.className = 'toggle pubnote';
    function draw() {
      var n = changes.length + Object.keys(files).length, s = status;
      b.innerHTML = '<span class="b">[</span> PUBLISH' + (n ? ' · ' + n : '') + ' <span class="b">]</span>'; b.disabled = !!s.busy || !n; b.classList.toggle('on', n > 0);
      st.textContent = s.t || (n ? changes.join(' · ') : ''); st.classList.toggle('on', !!s.on); st.hidden = !st.textContent;
    }
    b.addEventListener('click', function () { if (!window.SITE_STORE.dirty()) return; publish().catch(function () {}); });
    el.appendChild(st); el.appendChild(b); draw(); listeners.push(draw);
    var hub = el.querySelector('a[href^="media.html"]'); if (hub) hub.setAttribute('href', hub.getAttribute('href').replace('media.html', 'hub.html'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', strip); else strip();
})();
