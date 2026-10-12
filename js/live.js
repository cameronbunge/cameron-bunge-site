/* the live site: no database to read from, so the exported arrangements (js/state.js) stand in for it, read-only */
(function () {
  if (window.claude) return;
  var S = window.SITE_STATE || {};
  window.SITE_LIVE = true; document.documentElement.classList.add('live');
  function doc(path) { var d = S[path]; return { get: function () { return Promise.resolve({ exists: !!d, data: function () { return d; } }); }, set: function () { return Promise.reject(new Error('read-only')); } }; }
  window.claude = { use: function (name) { return Promise.resolve(name === 'db' ? { doc: doc } : null); } };
})();
