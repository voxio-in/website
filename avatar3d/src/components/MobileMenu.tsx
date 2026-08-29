import { ArrowUpRight, X } from 'lucide-react';
import Logo from './Logo';
import { NAV_LINKS } from './links';

type MobileMenuProps = { onClose: () => void };

/** Full-screen white navigation panel, shown only while the burger is active. */
export default function MobileMenu({ onClose }: MobileMenuProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white px-5 py-5 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-16 flex flex-col gap-8">
        {NAV_LINKS.map((label) => (
          <a
            key={label}
            href="#"
            onClick={onClose}
            className="text-3xl font-semibold uppercase tracking-widest text-black"
          >
            {label}
          </a>
        ))}
      </div>

      <a
        href="#"
        className="mt-auto inline-flex items-center gap-2 text-xl font-semibold uppercase tracking-widest text-accent"
      >
        Work With Us
        <ArrowUpRight size={22} />
      </a>
    </div>
  );
}
