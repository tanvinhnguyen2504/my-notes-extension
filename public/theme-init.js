/* Runs before first paint, from <head>, on every extension page.
 *
 * Without it the popup paints with whatever `data-theme` the HTML carries and
 * React corrects it in an effect -- one frame later, which a dark-mode user
 * sees as a white flash on every open.
 *
 * It cannot read chrome.storage: that API is callback-based and the paint has
 * already happened by the time it answers. localStorage is the only
 * synchronous source, so useResolvedTheme mirrors the preference into it.
 *
 * A packaged file, not an inline script -- MV3's CSP forbids inline. Plain
 * script, not a module: a module is deferred, which is exactly what must not
 * happen here.
 *
 * The key is duplicated from src/hooks/useResolvedTheme.ts (THEME_CACHE_KEY);
 * nothing can import across that boundary, and nothing reports a mismatch. */
(function () {
  var key = 'theme.pref.v1';
  var theme = 'light';
  try {
    // The PREFERENCE is cached, so 'system' is re-resolved on every open and
    // an OS change while the popup was shut cannot paint the wrong theme.
    var preference = localStorage.getItem(key);
    if (preference === 'light' || preference === 'dark') {
      theme = preference;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (e) {
    /* Fall through to light: a wrong first frame beats no page. */
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
