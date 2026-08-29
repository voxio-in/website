// glass-card.js — keeps a refracted duplicate of the background video
// registered 1:1 behind the card.

// Padding around the card, in CSS px, that the refraction surface bleeds into.
// The filter shifts each colour channel by a different amount (33 / 28 / 24px —
// see the comment on the filter in index.html), so the surface's own top and left
// edges carry hard channel-separation bands up to 33px wide. This margin keeps the
// card's boundary clear of them, with 2x headroom, so only clean dispersion shows.
//
// The surface used to be sized to the whole VIEWPORT, which hid the bands just as
// well but pushed ~30x more pixels through the filter on every single frame.
const MARGIN = 64;

// The duplicate stays at 1x even on retina: the SVG filter's cost scales with
// pixel count, and what shows through is a soft refraction where 4x the filter
// work buys nothing.
const DUP_PIXEL_RATIO = 1;

const video = document.getElementById('bg-video');
const card = document.querySelector('[data-glass-card]');
const container = document.getElementById('dup-video-container');
const canvas = document.getElementById('dup-image');
const menu = document.getElementById('menu');

if (video && card && container && canvas) {
  // No `desynchronized`: that hints at low-latency direct presentation, but this
  // canvas is never presented — it is only ever read back as a filter source.
  const ctx = canvas.getContext('2d', { alpha: false });

  // Kickstart: the element can settle at readyState 0 / networkState 2 without ever
  // finishing its initial fetch and without firing an error, which leaves both the
  // backdrop and the refraction blank. An explicit load() reliably starts it.
  const kickstart = () => {
    if (video.readyState === 0) video.load();
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  kickstart();
  setTimeout(() => { if (video.readyState === 0) kickstart(); }, 1000);

  // ---------------------------------------------------------------------------
  // Geometry. The page never scrolls and the card's box is fixed by CSS, so the
  // registration between duplicate and backdrop is CONSTANT. Measuring it per
  // frame — the obvious way to write this — forces a synchronous layout on every
  // frame to recompute a value that did not change. Measure on load, on resize,
  // and once when the entrance animation settles; never in the draw path.
  // ---------------------------------------------------------------------------

  // surface origin in viewport coords, and its size in CSS px
  let ox = 0, oy = 0, cw = 0, ch = 0;

  const measure = () => {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    cw = Math.ceil(rect.width) + MARGIN * 2;
    ch = Math.ceil(rect.height) + MARGIN * 2;

    // clientLeft/clientTop are the card's border widths: the container is
    // absolutely positioned against the PADDING box, not the border box.
    const baseX = rect.left + card.clientLeft;
    const baseY = rect.top + card.clientTop;

    // Snap the surface to whole viewport pixels so the drawn copy lands on the
    // same pixel grid as the real video behind it, and so the filter is not
    // re-rasterised at a new subpixel offset. The card itself may sit at a
    // fractional position, so the fraction is absorbed by the container offset —
    // which is fine, because it is written once rather than per frame.
    ox = Math.round(baseX) - MARGIN;
    oy = Math.round(baseY) - MARGIN;

    container.style.left = `${ox - baseX}px`;
    container.style.top = `${oy - baseY}px`;
    container.style.width = `${cw}px`;
    container.style.height = `${ch}px`;

    const w = Math.round(cw * DUP_PIXEL_RATIO);
    const h = Math.round(ch * DUP_PIXEL_RATIO);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const draw = () => {
    if (!cw || !ch) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // reproduce object-fit: cover, then crop out just the surface's rectangle.
    // A viewport point p maps to source point s0 + p / cover.
    const cover = Math.max(vw / video.videoWidth, vh / video.videoHeight);
    const sx0 = (video.videoWidth - vw / cover) / 2;
    const sy0 = (video.videoHeight - vh / cover) / 2;

    try {
      ctx.drawImage(
        video,
        sx0 + ox / cover, sy0 + oy / cover, cw / cover, ch / cover,
        0, 0, canvas.width, canvas.height,
      );
    } catch (err) {
      // a frame may not be decodable yet — skip it
    }
  };

  // ---------------------------------------------------------------------------
  // Loop. Driven from the video's own frame cadence, not rAF: the source is
  // ~24fps while rAF fires at the display rate, so a rAF loop re-runs the
  // (expensive) filter on frames that are pixel-identical.
  // ---------------------------------------------------------------------------

  const hasRVFC = typeof video.requestVideoFrameCallback === 'function';
  let running = false;

  const onFrame = () => {
    if (!running) return;
    draw();
    if (hasRVFC) video.requestVideoFrameCallback(onFrame);
    else requestAnimationFrame(onFrame);
  };

  const start = () => {
    if (running) return;
    running = true;
    onFrame();
  };
  const stop = () => { running = false; };

  // Skip the work entirely when nothing can be seen. The menu's backdrop covers
  // the card behind a full-viewport backdrop-filter, and compositing that blur
  // on top of a live 13-pass filter is what makes the panel's 500ms slide stutter.
  const menuOpen = () => !!menu && menu.classList.contains('is-open');
  const sync = () => {
    if (document.hidden || menuOpen()) stop();
    else start();
  };

  if (menu) {
    new MutationObserver(sync).observe(menu, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
  document.addEventListener('visibilitychange', sync);

  // The card also moves on resize, which produces no new video frame.
  // Coalesce to one measure+draw per frame — resize fires in bursts.
  let pendingResize = false;
  addEventListener('resize', () => {
    if (pendingResize) return;
    pendingResize = true;
    requestAnimationFrame(() => {
      pendingResize = false;
      measure();
      draw();
    });
  }, { passive: true });

  // The entrance animation translates the card 28px over 900ms. Re-registering
  // against it every frame means a forced layout plus a full filter re-raster at
  // a fresh subpixel offset on each of those frames — the jankiest stretch of the
  // page load. Instead the duplicate simply rides along with the card and snaps
  // to true registration once the animation settles; while the card is fading up
  // from opacity 0, an offset of at most 28px is not perceptible.
  card.addEventListener('animationend', () => { measure(); draw(); });

  measure();
  sync();
}
