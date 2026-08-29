import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** stagger, in milliseconds */
  delay?: number;
  className?: string;
};

/**
 * Fades and lifts its children into place the first time they enter the
 * viewport. One-way: once shown, an element is never re-hidden on scroll back.
 */
export default function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Without IntersectionObserver the content must still be readable, so show
    // it immediately rather than leaving it at opacity 0.
    if (typeof IntersectionObserver !== 'function') {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setShown(true);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transition: 'all 700ms ease-out', transitionDelay: `${delay}ms` }}
      className={`will-change-transform ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}
