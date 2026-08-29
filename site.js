// site.js — shared behaviour for the Voxio subpages (work.html, collaborations.html).
//
// index.html carries its own inline copy of this logic on purpose: it is a
// single self-contained document. This file exists so the subpages do not each
// grow a third and fourth copy.
//
// Two responsibilities: the collapsed-nav menu, and the scroll reveal.

(function () {
  // ---------- menu ----------
  var burger = document.getElementById('burger');
  var backdrop = document.getElementById('menu-backdrop');
  var nav = document.getElementById('site-nav');
  // Must stay in sync with the collapsed-nav breakpoint in site.css, which is
  // 1150px — deliberately not the 900px phone breakpoint.
  var wide = window.matchMedia('(min-width: 1151px)');

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }

  if (burger) {
    burger.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
  }
  if (backdrop) backdrop.addEventListener('click', function () { setMenu(false); });
  if (nav) {
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  function onWide(e) { if (e.matches) setMenu(false); }
  if (typeof wide.addEventListener === 'function') wide.addEventListener('change', onWide);
  else wide.addListener(onWide);

  // ---------- scroll reveal ----------
  // The .rise hidden state is gated on .js-rise, set here rather than in the
  // stylesheet, so with JS disabled the sections render plainly visible instead
  // of stuck at opacity 0.
  //
  // Three independent paths reveal an element, because the cost of this failing
  // is an invisible page. IntersectionObserver is the good path; a throttled
  // scroll/resize check covers the case where its callbacks never arrive (which
  // does happen on a throttled or backgrounded renderer); and a hard deadline
  // reveals everything regardless if the first two have produced nothing.
  var rises = Array.prototype.slice.call(document.querySelectorAll('.rise'));

  if (rises.length) {
    document.documentElement.classList.add('js-rise');

    var pending = rises.slice();

    function show(el) {
      el.classList.add('in-view');
      var i = pending.indexOf(el);
      if (i > -1) pending.splice(i, 1);
    }
    function revealAll() {
      pending.slice().forEach(show);
    }
    // Reveal anything currently within a viewport-and-a-bit of the user.
    function sweep() {
      pending.slice().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.94 && r.bottom > 0) show(el);
      });
    }

    var io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          io.unobserve(entry.target); // reveal is one-way; never re-hide on scroll up
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
      rises.forEach(function (el) { io.observe(el); });
    }

    // Fallback path: same decision, driven by scroll instead of by the observer.
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; sweep(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Whatever is on screen at load, or jumped to via a #hash, must not wait for
    // a scroll event that may never come.
    requestAnimationFrame(sweep);
    window.addEventListener('load', sweep);

    // Last resort. If nothing has been revealed by now the mechanism is broken,
    // and a visible page without animation beats an animated invisible one.
    setTimeout(function () {
      if (pending.length === rises.length) revealAll();
    }, 2500);
  }
})();
