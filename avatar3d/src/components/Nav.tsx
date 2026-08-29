import { motion } from 'framer-motion';
import { fadeDown } from '../motion';
import Logo from './Logo';
import { NAV_LINKS } from './links';

type NavProps = { onOpenMenu: () => void };

export default function Nav({ onOpenMenu }: NavProps) {
  return (
    <nav className="flex items-center justify-between px-5 pt-5 sm:px-8 md:px-12 md:pt-6">
      <motion.div variants={fadeDown} initial="hidden" animate="visible" custom={0}>
        <Logo />
      </motion.div>

      <div className="hidden items-center gap-8 md:flex lg:gap-10">
        {NAV_LINKS.map((label, i) => (
          <motion.a
            key={label}
            href="#"
            // custom starts at 1: the logo owns index 0, so the links continue
            // the same stagger rather than restarting it.
            custom={i + 1}
            variants={fadeDown}
            initial="hidden"
            animate="visible"
            className="text-sm font-semibold uppercase tracking-widest text-black"
          >
            {label}
          </motion.a>
        ))}
      </div>

      <motion.button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        custom={5}
        variants={fadeDown}
        initial="hidden"
        animate="visible"
        className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-full bg-black"
      >
        <span className="h-0.5 w-4 bg-white" />
        <span className="h-0.5 w-4 bg-white" />
        <span className="h-0.5 w-4 bg-white" />
      </motion.button>
    </nav>
  );
}
