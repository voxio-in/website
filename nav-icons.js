// nav-icons.js — turns the text nav into an icon-first nav.
//
// Every link gets an icon and keeps its text in a .nav-label span; the CSS
// collapses that span to zero width unless the link is the current one, so the
// bar reads as icons with the current item spelled out. The label opens and
// closes with a width transition, and the pill in nav-glass.js is re-measured
// while it does, so the two move together.
//
// It also builds the Products flyout: the trigger lives in the first nav pane
// and the products pane becomes a floating sheet parked beside it.

(function () {
  var shell = document.getElementById('site-nav');
  if (!shell) return;

  // ---------------------------------------------------------------------------
  // icons
  // ---------------------------------------------------------------------------
  // 20x20 stroked glyphs, all on the same grid so they optically match at the
  // small size the bar uses.
  var P = {
    home:    '<path d="M3.5 9.6 10 4l6.5 5.6"/><path d="M5.4 8.6V16h9.2V8.6"/><path d="M8.4 16v-3.6h3.2V16"/>',
    work:    '<rect x="3" y="6.4" width="14" height="9.6" rx="2"/><path d="M7.6 6.4V5.2A1.2 1.2 0 0 1 8.8 4h2.4a1.2 1.2 0 0 1 1.2 1.2v1.2"/><path d="M3 10.6h14"/>',
    quote:   '<path d="M4 4.8h12a1.6 1.6 0 0 1 1.6 1.6v6a1.6 1.6 0 0 1-1.6 1.6H8.4L5 17v-3H4a1.6 1.6 0 0 1-1.6-1.6v-6A1.6 1.6 0 0 1 4 4.8Z"/><path d="M6.6 9.4h1.6M10 9.4h3.4"/>',
    users:   '<circle cx="7.6" cy="7.4" r="2.6"/><path d="M3 16.2c0-2.3 2-3.8 4.6-3.8s4.6 1.5 4.6 3.8"/><path d="M13.2 5.2a2.6 2.6 0 0 1 0 4.9"/><path d="M14.2 12.7c1.8.4 2.9 1.6 2.9 3.5"/>',
    info:    '<circle cx="10" cy="10" r="7"/><path d="M10 9v4.4"/><path d="M10 6.6h.01"/>',
    grid:    '<rect x="3.2" y="3.2" width="5.8" height="5.8" rx="1.4"/><rect x="11" y="3.2" width="5.8" height="5.8" rx="1.4"/><rect x="3.2" y="11" width="5.8" height="5.8" rx="1.4"/><rect x="11" y="11" width="5.8" height="5.8" rx="1.4"/>',
    phone:   '<path d="M6.9 3.6 8.6 7 7 8.6a9.4 9.4 0 0 0 4.4 4.4L13 11.4l3.4 1.7v2.5a1.4 1.4 0 0 1-1.5 1.4C9.2 16.6 3.4 10.8 3 5.1a1.4 1.4 0 0 1 1.4-1.5h2.5Z"/>',
    avatar:  '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="8.2" r="2.4"/><path d="M5.4 15.6a5 5 0 0 1 9.2 0"/>',
    compass: '<circle cx="10" cy="10" r="7"/><path d="M13.2 6.8 11.5 11.5 6.8 13.2 8.5 8.5Z"/>',
    gear:    '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9 13.7 6.3M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9"/>',
    globe:   '<circle cx="10" cy="10" r="7"/><path d="M3 10h14"/><path d="M10 3a11 11 0 0 1 0 14 11 11 0 0 1 0-14Z"/>',
    face:    '<circle cx="10" cy="10" r="7"/><path d="M7.4 8.2h.01M12.6 8.2h.01"/><path d="M7 12.2a3.6 3.6 0 0 0 6 0"/>',
    target:  '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3.4"/><path d="M10 8.6v2.8"/>',
    flag:    '<path d="M5 17V3.8"/><path d="M5 4.4h9.6l-1.8 3.1 1.8 3.1H5"/>'
  };

  // by link target first — the same word can mean different things per site —
  // then by label text.
  var BY_HREF = {
    'index.html': 'home',
    'work.html': 'work',
    'testimonials.html': 'quote',
    'collaborations.html': 'users',
    'about.html': 'info',
    'calling.html': 'phone',
    'calling-work.html': 'work',
    'calling-testimonials.html': 'quote',
    'calling-collaborations.html': 'users',
    'calling-about.html': 'info',
    'avatar.html': 'avatar',
    'webnav.html': 'compass',
    'contact.html': 'quote'
  };
  var BY_TEXT = {
    'home': 'home',
    'work': 'work',
    'testimonials': 'quote',
    'collaborations': 'users',
    'about us': 'info',
    'products': 'grid',
    'calling agents': 'phone',
    '3d avatar agents': 'avatar',
    'website navigation': 'compass',
    'how it works': 'gear',
    'how a session goes': 'gear',
    'where it runs': 'globe',
    'the face': 'face',
    'what it is for': 'target',
    'where it stands': 'flag'
  };

  function iconFor(el) {
    var text = (el.textContent || '').trim().toLowerCase();
    var href = el.getAttribute('href') || '';
    var file = href.split('#')[0].split('/').pop();
    var key = null;
    // "Home" on a product site points at that product's own page, so the label
    // has to win there; elsewhere the target is the better clue.
    if (href.charAt(0) !== '#') key = BY_TEXT[text] || BY_HREF[file];
    if (!key) key = BY_TEXT[text] || (href.charAt(0) === '#' ? 'target' : null);
    return P[key] || P.info;
  }

  function decorate(el) {
    if (el.querySelector('.nav-ico')) return;
    var label = (el.textContent || '').trim();
    var ico = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ico.setAttribute('viewBox', '0 0 20 20');
    ico.setAttribute('fill', 'none');
    ico.setAttribute('stroke', 'currentColor');
    ico.setAttribute('stroke-width', '1.5');
    ico.setAttribute('stroke-linecap', 'round');
    ico.setAttribute('stroke-linejoin', 'round');
    ico.setAttribute('aria-hidden', 'true');
    ico.innerHTML = iconFor(el);

    var wrap = document.createElement('span');
    wrap.className = 'nav-ico';
    wrap.appendChild(ico);

    var span = document.createElement('span');
    span.className = 'nav-label';
    span.textContent = label;

    el.textContent = '';
    el.appendChild(wrap);
    el.appendChild(span);
    // With the text clipped away the link would otherwise announce nothing.
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
  }

  // ---------------------------------------------------------------------------
  // the Products flyout
  // ---------------------------------------------------------------------------
  // The second nav pane on the main site is the products list. It leaves the
  // row and becomes a floating pane, opened by a trigger added to the first.

  var panes = Array.prototype.slice.call(shell.querySelectorAll('.glass-bar--nav'));
  var mainNav = panes[0] && panes[0].querySelector('.nav');
  var fly = null, trigger = null;

  if (panes.length > 1 && mainNav) {
    fly = panes[1];
    fly.classList.add('glass-bar--flyout');
    fly.id = 'nav-products';
    fly.querySelector('.nav').classList.add('nav-flyout');

    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'nav-products');
    trigger.textContent = 'Products';
    mainNav.appendChild(trigger);
  }

  Array.prototype.slice.call(shell.querySelectorAll('.nav a')).forEach(decorate);
  if (trigger) decorate(trigger);

  if (fly) {
    // The pane is absolutely positioned inside the shell, so it needs the
    // trigger's offset — re-measured on open, since labels change widths.
    var wide = window.matchMedia('(min-width: 1151px)');
    var open = false, closeTimer = null;

    var setOpen = function (v) {
      if (!wide.matches) return;
      open = v;
      fly.classList.toggle('is-open', v);
      trigger.setAttribute('aria-expanded', v ? 'true' : 'false');
      follow();   // the row is widening; keep the pill on its link
    };
    var openNow = function () { clearTimeout(closeTimer); setOpen(true); };
    // A short grace period, so a pointer clipping the corner of the gap does
    // not snap the pane shut mid-travel.
    var closeSoon = function () {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () { setOpen(false); }, 140);
    };

    [trigger, fly].forEach(function (el) {
      el.addEventListener('mouseenter', openNow);
      el.addEventListener('mouseleave', closeSoon);
      el.addEventListener('focusin', openNow);
      el.addEventListener('focusout', closeSoon);
    });
    // Touch has no hover: the trigger toggles instead.
    trigger.addEventListener('click', function () {
      clearTimeout(closeTimer);
      setOpen(!open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); trigger.focus(); }
    });
  }

  // ---------------------------------------------------------------------------
  // keeping the travelling pill in step
  // ---------------------------------------------------------------------------
  // The current link's width changes over the label transition, so a pill
  // placed once on click ends up the wrong size. Re-measure every frame for
  // the length of that transition; nav-glass.js exposes the hook.

  // One loop, whose deadline is pushed forward by each new event — hovering
  // along the bar fires these constantly, and a loop per event would stack up.
  var followUntil = 0, following = false;
  function follow() {
    followUntil = performance.now() + 560;
    if (following) return;
    following = true;
    (function step(t) {
      if (typeof window.navGlassPlace === 'function') window.navGlassPlace();
      if (t < followUntil) requestAnimationFrame(step);
      else following = false;
    })(performance.now());
  }
  // Any label opening or closing moves the links after it, so the pill is
  // re-measured on hover as well as on click.
  shell.addEventListener('pointerover', follow);
  shell.addEventListener('pointerout', follow);
  shell.addEventListener('click', follow);
  shell.addEventListener('focusin', follow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(follow);
  follow();
})();
