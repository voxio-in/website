// hero-reveal.js — the cursor-trailing spotlight on the calling hero.
//
// Two images stacked on the same ridge: the barren one on top, the overgrown one
// beneath it, revealed only inside a soft circle that trails the pointer.
//
// The original (lithos/src/App.tsx) painted the mask into a canvas and handed it
// over as a data URI via toDataURL on EVERY pointer frame — a full readback and
// base64 encode of a viewport-sized surface, sixty times a second. Its comment
// says a CSS radial-gradient mask "cannot reproduce this stop curve", but CSS
// gradients take arbitrary stops, so the same six stops are written directly
// into a mask-image below and moved with two custom properties. Same curve, no
// per-frame allocation.

(function () {
  'use strict';

  var hero = document.querySelector('.callhero');
  if (!hero) return;

  var layer = hero.querySelector('.callhero-reveal');
  if (!layer) return;

  // Where the pointer is, and where the light actually is. They are different on
  // purpose: the light closes a tenth of the gap each frame, and that lag is
  // what gives the reveal its weight.
  var target = { x: -9999, y: -9999 };
  var eased = { x: -9999, y: -9999 };
  var raf = null;
  var idle = true;

  function onMove(e) {
    var r = hero.getBoundingClientRect();
    target.x = e.clientX - r.left;
    target.y = e.clientY - r.top;
    if (idle) {
      // Jump on the first move rather than sweeping in from off-screen.
      eased.x = target.x;
      eased.y = target.y;
      idle = false;
      hero.classList.add('is-lit');
    }
  }

  function tick() {
    eased.x += (target.x - eased.x) * 0.1;
    eased.y += (target.y - eased.y) * 0.1;
    layer.style.setProperty('--mx', eased.x.toFixed(1) + 'px');
    layer.style.setProperty('--my', eased.y.toFixed(1) + 'px');
    raf = requestAnimationFrame(tick);
  }

  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', function () {
    idle = true;
    hero.classList.remove('is-lit');
  });

  // Touch has no hover, so the spotlight would never appear. Park it over the
  // headline and let the CSS breathe it instead of tracking a pointer.
  var coarse = window.matchMedia('(hover: none)');
  function applyCoarse() {
    if (coarse.matches) {
      hero.classList.add('is-auto');
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    } else {
      hero.classList.remove('is-auto');
      if (!raf) raf = requestAnimationFrame(tick);
    }
  }
  if (typeof coarse.addEventListener === 'function') coarse.addEventListener('change', applyCoarse);
  applyCoarse();

  // Stop the loop when the hero is off screen — it is a full viewport of
  // compositing that nobody is looking at once the console is in view.
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (!raf && !coarse.matches) raf = requestAnimationFrame(tick);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
      });
    }, { threshold: 0.01 }).observe(hero);
  }
})();
