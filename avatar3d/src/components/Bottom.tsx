import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { clipUp, fadeUp } from '../motion';
import { HEADING_WORDS } from './links';

export default function Bottom() {
  return (
    <div className="flex flex-col gap-6 px-5 pb-8 sm:px-8 md:gap-12 md:px-12 md:pb-12">
      {/* ---------- row A: tagline + CTA ---------- */}
      <div className="flex items-center justify-between gap-4">
        <motion.p
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="max-w-[130px] text-[10px] font-semibold uppercase tracking-widest text-black sm:max-w-[160px] sm:text-xs md:max-w-xs md:text-sm"
        >
          Shaping Bold
          <br />
          Visions Into Power
          <br />
          For Your Tribe
        </motion.p>

        <motion.a
          href="#"
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 whitespace-nowrap text-base uppercase tracking-widest text-accent sm:text-xl md:text-2xl"
          style={{ fontWeight: 600 }}
        >
          Work With Us
          <ArrowUpRight size={18} className="sm:hidden" />
          <ArrowUpRight size={22} className="hidden sm:block" />
        </motion.a>
      </div>

      {/* ---------- row B: description + heading ---------- */}
      <div className="flex items-end justify-between gap-3 sm:gap-4">
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="w-[120px] shrink-0 sm:w-[180px] md:w-[280px]"
        >
          <p className="text-left text-[9px] font-semibold uppercase tracking-widest text-black sm:text-xs md:text-right md:text-sm">
            Creative Studios Built Around Elevating Your Vision Into Striking Reality
          </p>
        </motion.div>

        <h1 className="text-right">
          {HEADING_WORDS.map((word, i) => (
            // The wrapper does the clipping; the inner span is what moves, so the
            // word appears to rise out of solid ground rather than fade in.
            <span key={word} className="block overflow-hidden">
              <motion.span
                custom={i}
                variants={clipUp}
                initial="hidden"
                animate="visible"
                className="block uppercase text-black"
                style={{
                  fontSize: 'clamp(2rem, 9vw, 9rem)',
                  lineHeight: 0.88,
                  fontWeight: 600,
                }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
