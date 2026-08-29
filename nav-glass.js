// nav-glass.js — the iOS-style selection pill in the nav bar.
//
// The bar is several separate glass panes side by side, so there is one
// indicator PER NAV PANE rather than one for the whole header. Only the pane
// holding the current link shows its pill; the others keep theirs hidden. A
// single pill cannot be shared, because each pane is its own positioned box and
// the pill would have to leave it to reach a link in the next one.
//
// The pill sits BEHIND the link text (z-index 1 against the links' 2) and is
// positioned against its own pane.

(function () {
  var panes = Array.prototype.slice.call(document.querySelectorAll('.glass-bar'))
    // The Products flyout is a pane too, but it is a menu, not a place you
    // can be, so it never owns a pill.
    .filter(function (b) {
      return b.querySelector('.nav a') && !b.classList.contains('glass-bar--flyout');
    });
  if (!panes.length) return;

  // one indicator per pane, kept alongside the pane that owns it
  var inds = panes.map(function (pane) {
    var el = document.createElement('span');
    el.className = 'nav-ind';
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
    pane.appendChild(el);
    return el;
  });

  function paneOf(link) {
    for (var i = 0; i < panes.length; i++) {
      if (panes[i].contains(link)) return i;
    }
    return -1;
  }

  var links = [];
  panes.forEach(function (pane) {
    links = links.concat(Array.prototype.slice.call(pane.querySelectorAll('.nav a')));
  });
  if (!links.length) return;

  // The collapsed nav turns the bar into a wordmark + burger and the links move
  // into a full-screen menu, where a travelling pill means nothing.
  var wide = window.matchMedia('(min-width: 1151px)');

  var current = null;
  var dragging = false;

  // ---------------------------------------------------------------------------
  // placement
  // ---------------------------------------------------------------------------

  // Offsets are measured against the owning pane's border box every time rather
  // than cached: the pane's width changes with the viewport, and a stale offset
  // parks the pill under the wrong word.
  function place(el, animate) {
    if (!el) return;
    var i = paneOf(el);
    if (i < 0) return;
    var ind = inds[i];
    var b = panes[i].getBoundingClientRect();
    var r = el.getBoundingClientRect();
    ind.style.transition = animate ? '' : 'none';
    ind.style.width = r.width + 'px';
    ind.style.height = r.height + 'px';
    ind.style.transform = 'translate(' + (r.left - b.left) + 'px,' + (r.top - b.top) + 'px)';
    if (!animate) {
      // force a reflow so the next change animates from here rather than
      // collapsing into the same frame as this one
      void ind.offsetWidth;
      ind.style.transition = '';
    }
  }

  // Moving between panes cannot be animated — the pill would have to travel
  // outside its own pane to do it. Within a pane it springs as before; across
  // panes the old one is hidden and the new one placed without transition.
  function show(el, animate) {
    var i = paneOf(el);
    inds.forEach(function (ind, k) {
      if (k !== i) ind.style.display = 'none';
    });
    if (i < 0) return;
    var wasHidden = inds[i].style.display === 'none';
    inds[i].style.display = '';
    place(el, animate && !wasHidden);
  }

  function setCurrent(el, animate) {
    if (!el) return;
    if (el === current) { place(el, animate); return; }
    links.forEach(function (a) { a.classList.toggle('is-current', a === el); });
    current = el;
    show(el, animate);
  }

  // ---------------------------------------------------------------------------
  // which link is "here" on load
  // ---------------------------------------------------------------------------

  function initial() {
    // an explicit aria-current wins — the subpages set it server-side
    var marked = links.filter(function (a) { return a.getAttribute('aria-current') === 'page'; })[0];
    if (marked) return marked;

    if (location.hash) {
      var byHash = links.filter(function (a) {
        return a.getAttribute('href') === location.hash;
      })[0];
      if (byHash) return byHash;
    }
    // A page with no nav entry of its own — Contact, for instance — must not
    // park the pill on Home and claim the visitor is somewhere they are not.
    var file = (location.pathname.split('/').pop() || 'index.html');
    var onNav = links.some(function (a) {
      return (a.getAttribute('href') || '').split('/').pop() === file;
    });
    if (!onNav && file !== 'index.html' && file !== '') return null;

    // otherwise the first in-page link, which is Home
    return links.filter(function (a) {
      return (a.getAttribute('href') || '').charAt(0) === '#';
    })[0] || links[0];
  }

  // ---------------------------------------------------------------------------
  // scroll spy — only for links that point at a section on this page
  // ---------------------------------------------------------------------------

  var spy = links
    .map(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '#' || href === '#') return null;
      var sec = document.getElementById(href.slice(1));
      return sec ? { link: a, sec: sec } : null;
    })
    .filter(Boolean);

  function onSpy() {
    if (dragging || !wide.matches || !spy.length) return;
    // the section covering the upper third of the viewport is the one being read
    var line = window.innerHeight * 0.34;
    var best = null;
    spy.forEach(function (s) {
      var top = s.sec.getBoundingClientRect().top;
      if (top <= line && (!best || top > best.top)) best = { top: top, link: s.link };
    });
    // above the first section, nothing is active but Home
    if (!best && spy.length) best = { link: spy[0].link };
    if (best) setCurrent(best.link, true);
  }

  // ---------------------------------------------------------------------------
  // drag — pick the pill up and slide it along its pane
  // ---------------------------------------------------------------------------
  //
  // The pill paints BEHIND the link text, so it can never receive a pointerdown
  // itself — the link on top of it always wins. The gesture is therefore started
  // on the pane and hit-tested against the pill's own rect, which also keeps
  // every link normally clickable. A drag is confined to the pane that owns the
  // pill; the panes either side are separate sheets, not more of this one.

  var startX = 0, startLeft = 0, moved = false, dragPane = -1;

  function nearestIn(paneIdx, clientX) {
    var best = null, bestD = Infinity;
    links.forEach(function (a) {
      if (paneOf(a) !== paneIdx) return;
      var r = a.getBoundingClientRect();
      var d = Math.abs(clientX - (r.left + r.width / 2));
      if (d < bestD) { bestD = d; best = a; }
    });
    return best;
  }

  panes.forEach(function (pane, i) {
    pane.addEventListener('pointerdown', function (e) {
      if (!wide.matches || !current || e.button !== 0) return;
      if (paneOf(current) !== i) return;      // this pane does not hold the pill
      var r = inds[i].getBoundingClientRect();
      // only a press that lands on the pill starts a drag
      if (e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top || e.clientY > r.bottom) return;

      dragging = true;
      dragPane = i;
      moved = false;
      startX = e.clientX;
      startLeft = r.left - pane.getBoundingClientRect().left;
      inds[i].style.transition = 'none';
      inds[i].classList.add('is-dragging');
      pane.setPointerCapture(e.pointerId);
    });

    pane.addEventListener('pointermove', function (e) {
      if (!dragging || dragPane !== i) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      var b = pane.getBoundingClientRect();
      var r = inds[i].getBoundingClientRect();
      var y = current.getBoundingClientRect().top - b.top;
      // clamp to the pane so the pill cannot be thrown off the end
      var x = Math.max(0, Math.min(b.width - r.width, startLeft + dx));
      inds[i].style.transform = 'translate(' + x + 'px,' + y + 'px)';
    });

    function endDrag(e) {
      if (!dragging || dragPane !== i) return;
      dragging = false;
      inds[i].classList.remove('is-dragging');
      inds[i].style.transition = '';
      if (moved) {
        setCurrent(nearestIn(i, e.clientX) || current, true);
        // A drag that ends over a link would otherwise fire that link's click
        // and navigate. Swallow exactly one click, in the capture phase.
        window.addEventListener('click', function swallow(ev) {
          ev.preventDefault();
          ev.stopPropagation();
          window.removeEventListener('click', swallow, true);
        }, true);
      } else {
        place(current, true);
      }
      dragPane = -1;
    }
    pane.addEventListener('pointerup', endDrag);
    pane.addEventListener('pointercancel', endDrag);
  });

  // ---------------------------------------------------------------------------
  // wiring
  // ---------------------------------------------------------------------------

  links.forEach(function (a) {
    a.addEventListener('click', function () { setCurrent(a, true); });
    // keyboard focus should move the pill too, or tabbing looks broken
    a.addEventListener('focus', function () { if (wide.matches) setCurrent(a, true); });
  });

  window.addEventListener('hashchange', function () {
    var byHash = links.filter(function (x) {
      return x.getAttribute('href') === location.hash;
    })[0];
    if (byHash) setCurrent(byHash, true);
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; onSpy(); });
  }, { passive: true });

  window.addEventListener('resize', function () { place(current, false); }, { passive: true });

  // Fonts land after first paint and change every link's width, so a pill placed
  // before then sits at the wrong size. Re-place once they are ready.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { place(current, false); });
  }

  // nav-icons.js opens and closes the label of the current link over ~0.5s,
  // which changes its width under the pill; it drives this hook each frame so
  // the pill stays wrapped around the link while that happens.
  window.navGlassPlace = function (animate) { place(current, !!animate); };

  var first = initial();
  if (!first) return;                 // every pill stays hidden
  setCurrent(first, false);
  requestAnimationFrame(function () { place(current, false); });
  window.addEventListener('load', function () { place(current, false); });
})();
