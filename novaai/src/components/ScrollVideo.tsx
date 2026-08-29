import { useEffect, useRef, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4';

/** First-frame still, if a local mirror has been dropped next to the page. */
const POSTER_URL = './hero-poster.jpg';

/** Upper bound on cached frames. Beyond this the memory cost stops paying off. */
const MAX_FRAMES = 90;
const MIN_FRAMES = 24;
const FRAMES_PER_SECOND = 12;
/** Cached frames are downscaled — they are only ever drawn as a background. */
const MAX_FRAME_WIDTH = 960;

/** How much of the gap to the target progress is closed per frame. */
const LERP = 0.12;
/** Seeking for less than this is imperceptible and only costs decode work. */
const SEEK_EPSILON = 0.04;

/**
 * Rate for the capture sweep. Frames are grabbed as the clip plays rather than
 * by seeking to each timestamp: linear decode is roughly an order of magnitude
 * faster than a seek per frame, which is what made the cache take so long to
 * arrive that the page spent its whole life on the slow fallback path. 4x is
 * deliberately conservative — higher rates make browsers drop frames.
 */
const CAPTURE_RATE = 4;

/** Below this many distinct captured frames the cache is not worth publishing. */
const MIN_CAPTURED = 12;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};
type FastSeekVideo = HTMLVideoElement & { fastSeek?: (time: number) => void };

/** object-cover, as canvas draw arguments: scale to fill, crop the overflow. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  cw: number,
  ch: number,
) {
  if (!sw || !sh || !cw || !ch) return;
  const scale = Math.max(cw / sw, ch / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

/**
 * Spreads captured frames across the holes left by frames that arrived while a
 * previous grab was still encoding. Neighbours are shared by reference, so the
 * returned array must not be treated as owning its bitmaps.
 */
function fillHoles(frames: (ImageBitmap | null)[]): ImageBitmap[] | null {
  let carry: ImageBitmap | null = null;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i]) carry = frames[i];
    else frames[i] = carry;
  }
  // A second pass backwards covers leading holes, which have no earlier
  // neighbour to inherit from.
  carry = null;
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i]) carry = frames[i];
    else frames[i] = carry;
  }
  return frames.every(Boolean) ? (frames as ImageBitmap[]) : null;
}

/**
 * Full-bleed background whose playhead is driven by page scroll rather than by
 * time. Never autoplays for display.
 *
 * Three layers hand off to each other so there is always something on screen:
 * the poster covers the wait for the first decoded frame, the <video> itself
 * covers the wait for the frame cache, and the <canvas> takes over once frames
 * are cached. Scrubbing a <video> by assignment is inherently steppy and, on a
 * 10MB clip, latent — the cache is the intended path, not a fallback.
 */
export default function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const framesRef = useRef<ImageBitmap[]>([]);
  const targetRef = useRef(0);
  const smoothRef = useRef(0);

  const [hasFrame, setHasFrame] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const [posterBroken, setPosterBroken] = useState(false);

  // ---------------------------------------------------------------------------
  // canvas sizing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Capped at 2: beyond that the extra pixels are invisible and the fill
      // cost on a 3x phone display is real.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ---------------------------------------------------------------------------
  // scroll → smoothed progress → draw
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);

      // Recomputed every frame rather than cached on scroll: the document height
      // changes as sections reveal, and a stale height mis-maps the playhead.
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      targetRef.current =
        scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;

      smoothRef.current += (targetRef.current - smoothRef.current) * LERP;
      const p = smoothRef.current;

      const frames = framesRef.current;
      const canvas = canvasRef.current;

      if (frames.length && canvas) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const frame = frames[Math.round(p * (frames.length - 1))];
        if (frame) {
          drawCover(ctx, frame, frame.width, frame.height, canvas.width, canvas.height);
        }
        return;
      }

      // Fallback path: scrub the visible element directly.
      const video = videoRef.current as FastSeekVideo | null;
      if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return;

      // Gating on .seeking is what makes this usable. Assigning currentTime while
      // a seek is already outstanding aborts it and starts over, so at one
      // assignment per animation frame no seek ever gets to finish and frames
      // land seconds behind the scroll.
      if (video.seeking) return;

      const t = p * Math.max(0, video.duration - 0.05);
      if (Math.abs(video.currentTime - t) <= SEEK_EPSILON) return;
      // fastSeek trades exact frame accuracy for landing on the nearest
      // keyframe, which is the right trade for a background.
      if (typeof video.fastSeek === 'function') video.fastSeek(t);
      else video.currentTime = t;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------------------------------------------------------------------------
  // frame cache
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Capture saturates the decoder. Starting it before the visible video has
    // its first frame means the user stares at the poster for longer, so it
    // waits for loadeddata and then yields once more.
    if (!hasFrame) return;
    if (typeof createImageBitmap !== 'function') return;

    let cancelled = false;
    let off: HTMLVideoElement | null = null;
    /** Every bitmap this effect created, for release if it never publishes. */
    const owned: ImageBitmap[] = [];

    const timer = window.setTimeout(() => {
      void capture();
    }, 300);

    async function capture() {
      try {
        const source = document.createElement('video');
        off = source;
        // Required: without it the frames taint the canvas and createImageBitmap
        // on the drawn surface throws a security error.
        source.crossOrigin = 'anonymous';
        source.muted = true;
        source.playsInline = true;
        source.preload = 'auto';
        source.src = VIDEO_URL;
        // Detached media elements are throttled or skipped entirely by some
        // engines, so it is attached — but at 1px and transparent.
        source.style.cssText =
          'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none';
        document.body.appendChild(source);

        await new Promise<void>((resolve, reject) => {
          source.addEventListener('loadeddata', () => resolve(), { once: true });
          source.addEventListener('error', () => reject(new Error('load')), { once: true });
        });
        if (cancelled) return;

        const { duration, videoWidth: vw, videoHeight: vh } = source;
        if (!Number.isFinite(duration) || duration <= 0 || !vw || !vh) return;

        const count = Math.max(
          MIN_FRAMES,
          Math.min(MAX_FRAMES, Math.round(duration * FRAMES_PER_SECOND)),
        );
        const scale = Math.min(1, MAX_FRAME_WIDTH / vw);
        const fw = Math.max(1, Math.round(vw * scale));
        const fh = Math.max(1, Math.round(vh * scale));

        const scratch = document.createElement('canvas');
        scratch.width = fw;
        scratch.height = fh;
        const sctx = scratch.getContext('2d');
        if (!sctx) return;

        const span = Math.max(0.001, duration - 0.05);
        const frames: (ImageBitmap | null)[] = new Array(count).fill(null);

        // One grab at a time: createImageBitmap is async and the clip keeps
        // playing underneath, so overlapping grabs would race on the scratch
        // canvas. Frames missed while encoding become holes, filled afterwards.
        let busy = false;
        const grab = async () => {
          if (busy || cancelled) return;
          const i = Math.min(
            count - 1,
            Math.max(0, Math.round((source.currentTime / span) * (count - 1))),
          );
          if (frames[i]) return;
          busy = true;
          try {
            sctx.drawImage(source, 0, 0, fw, fh);
            const bitmap = await createImageBitmap(scratch);
            if (cancelled) {
              bitmap.close();
              return;
            }
            frames[i] = bitmap;
            owned.push(bitmap);
          } finally {
            busy = false;
          }
        };

        source.playbackRate = CAPTURE_RATE;

        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          const framed = source as FrameCallbackVideo;
          const step = () => {
            if (cancelled || source.ended) {
              finish();
              return;
            }
            void grab();
            // requestVideoFrameCallback fires once per *decoded* frame, so it
            // neither misses frames nor spins on repeats the way rAF does.
            if (framed.requestVideoFrameCallback) framed.requestVideoFrameCallback(step);
            else requestAnimationFrame(step);
          };
          source.addEventListener('ended', finish, { once: true });
          source.addEventListener('error', finish, { once: true });
          source.play().then(step, finish);
        });

        if (cancelled) return;
        if (owned.length < MIN_CAPTURED) return;

        const dense = fillHoles(frames);
        if (!dense) return;

        framesRef.current = dense;
        setCacheReady(true);
      } catch {
        // Any failure — CORS, a decode error, a browser that will not play an
        // offscreen video — leaves the <video> scrubbing path in charge.
      } finally {
        // Whether or not it published, the capture element has done its job and
        // should stop holding a decoder and 10MB of buffer.
        if (off) {
          off.pause();
          off.removeAttribute('src');
          off.load();
          off.remove();
          off = null;
        }
        if (framesRef.current.length === 0) owned.forEach((b) => b.close());
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasFrame]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
      {!posterBroken && (
        <img
          src={POSTER_URL}
          alt=""
          aria-hidden="true"
          onError={() => setPosterBroken(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            hasFrame || cacheReady ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedData={() => setHasFrame(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          hasFrame && !cacheReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          cacheReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
