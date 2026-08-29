import { motion } from 'framer-motion';
import { fadeUp } from '../motion';
import { STATS } from './links';

export default function Stats() {
  return (
    <div className="flex flex-1 items-center justify-end px-5 py-8 sm:px-8 md:px-12 md:py-0">
      <div className="flex gap-5 sm:gap-8 md:gap-10">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.value}
            // custom continues from the nav's stagger so the whole page reads as
            // one entrance: stats occupy 2-4, the bottom content 5-7.
            custom={i + 2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-right"
          >
            <p
              className="font-semibold leading-none text-black"
              style={{ fontSize: 'clamp(1.5rem, 5vw, 3.5rem)', fontWeight: 600 }}
            >
              <span className="text-accent" style={{ fontSize: '0.5em' }}>
                +
              </span>
              {stat.value}
            </p>
            <p className="whitespace-pre-line text-[10px] font-semibold uppercase leading-tight tracking-widest text-black sm:text-xs md:text-sm">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
