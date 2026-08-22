(async function () {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const s = await res.json();

    const root = document.documentElement;

    if (s.primaryColor) {
      root.style.setProperty('--purple',       s.primaryColor);
      root.style.setProperty('--purple-dark',  shade(s.primaryColor, -45));
      root.style.setProperty('--purple-light', shade(s.primaryColor,  30));
      root.style.setProperty('--light-purple', shade(s.primaryColor,  25));
    }
    if (s.accentColor) {
      root.style.setProperty('--orange', s.accentColor);
    }

    const p1 = esc(s.namePart1 || 'Red');
    const p2 = esc(s.namePart2 || 'Ex');

    // Update every navbar logo and footer logo on the page
    document.querySelectorAll('.logo, .footer-logo').forEach(el => {
      el.innerHTML = p1 + '<span>' + p2 + '</span>';
    });

    // Update browser tab title
    const title = document.title;
    document.title = title.replace(/^Red\s*Ex/i, (s.namePart1 || 'Red') + (s.namePart2 || 'Ex'));

  } catch (_) { /* fail silently — default branding stays */ }

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (n >> 16)        + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xFF) + amt));
    const b = Math.max(0, Math.min(255, (n & 0xFF)        + amt));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
