import type { Variants } from 'framer-motion';

/**
 * Shared easing. A single curve across every entrance keeps the staggered
 * elements reading as one movement rather than several.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Nav elements drop in from above, staggered by their `custom` index. */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, duration: 0.5, ease: EASE },
  }),
};

/** Stats and bottom content rise into place, staggered by their `custom` index. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.12, duration: 0.6, ease: EASE },
  }),
};

/**
 * Clip reveal for the headline. Each word starts fully below its own
 * overflow-hidden wrapper, so it appears to rise out of the line above.
 */
export const clipUp: Variants = {
  hidden: { y: '110%' },
  visible: (index: number = 0) => ({
    y: 0,
    transition: { delay: 0.4 + index * 0.14, duration: 0.7, ease: EASE },
  }),
};
