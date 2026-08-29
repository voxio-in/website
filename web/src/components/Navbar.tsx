// Navbar.tsx — the React port of the static header (nav-glass.js +
// nav-icons.js).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

type Item = {
  href?: LinkProps["to"];
  hash?: string;
  spy?: string[];
  label: string;
  icon: keyof typeof ICONS;
};

const ICONS = {
  home: (
    <>
      <path className="i-roof" d="M3.5 9.6 10 4l6.5 5.6" />
      <path d="M5.4 8.6V16h9.2V8.6" />
      <path className="i-door" d="M8.4 16v-3.6h3.2V16" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="6.4" width="14" height="9.6" rx="2" />
      <path className="i-handle" d="M7.6 6.4V5.2A1.2 1.2 0 0 1 8.8 4h2.4a1.2 1.2 0 0 1 1.2 1.2v1.2" />
      <path d="M3 10.6h14" />
    </>
  ),
  quote: (
    <>
      <path d="M4 4.8h12a1.6 1.6 0 0 1 1.6 1.6v6a1.6 1.6 0 0 1-1.6 1.6H8.4L5 17v-3H4a1.6 1.6 0 0 1-1.6-1.6v-6A1.6 1.6 0 0 1 4 4.8Z" />
      <path className="i-lines" d="M6.6 9.4h1.6M10 9.4h3.4" />
    </>
  ),
  users: (
    <>
      <circle cx="7.6" cy="7.4" r="2.6" />
      <path d="M3 16.2c0-2.3 2-3.8 4.6-3.8s4.6 1.5 4.6 3.8" />
      <path className="i-mate" d="M13.2 5.2a2.6 2.6 0 0 1 0 4.9" />
      <path className="i-mate" d="M14.2 12.7c1.8.4 2.9 1.6 2.9 3.5" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path className="i-stem" d="M10 9v4.4" />
      <path className="i-dot" d="M10 6.6h.01" />
    </>
  ),
  grid: (
    <>
      <rect className="i-tl" x="3.2" y="3.2" width="5.8" height="5.8" rx="1.4" />
      <rect className="i-tr" x="11" y="3.2" width="5.8" height="5.8" rx="1.4" />
      <rect className="i-bl" x="3.2" y="11" width="5.8" height="5.8" rx="1.4" />
      <rect className="i-br" x="11" y="11" width="5.8" height="5.8" rx="1.4" />
    </>
  ),
  phone: (
    <path className="i-handset" d="M6.9 3.6 8.6 7 7 8.6a9.4 9.4 0 0 0 4.4 4.4L13 11.4l3.4 1.7v2.5a1.4 1.4 0 0 1-1.5 1.4C9.2 16.6 3.4 10.8 3 5.1a1.4 1.4 0 0 1 1.4-1.5h2.5Z" />
  ),
  avatar: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle className="i-head" cx="10" cy="8.2" r="2.4" />
      <path className="i-shoulders" d="M5.4 15.6a5 5 0 0 1 9.2 0" />
    </>
  ),
  compass: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path className="i-needle" d="M13.2 6.8 11.5 11.5 6.8 13.2 8.5 8.5Z" />
    </>
  ),
  gear: (
    <>
      <circle cx="10" cy="10" r="2.6" />
      <path className="i-teeth" d="M10 2.8v2M10 15.2v2M17.2 10h-2M4.8 10h-2M15.1 4.9 13.7 6.3M6.3 13.7l-1.4 1.4M15.1 15.1l-1.4-1.4M6.3 6.3 4.9 4.9" />
    </>
  ),
  globe: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14" />
      <path className="i-meridian" d="M10 3a11 11 0 0 1 0 14 11 11 0 0 1 0-14Z" />
    </>
  ),
  face: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path className="i-eyes" d="M7.4 8.2h.01M12.6 8.2h.01" />
      <path className="i-smile" d="M7 12.2a3.6 3.6 0 0 0 6 0" />
    </>
  ),
  target: (
    <>
      <circle cx="10" cy="10" r="7" />
      <circle className="i-ring" cx="10" cy="10" r="3.4" />
      <path className="i-pin" d="M10 8.6v2.8" />
    </>
  ),
  flag: (
    <>
      <path d="M5 17V3.8" />
      <path className="i-cloth" d="M5 4.4h9.6l-1.8 3.1 1.8 3.1H5" />
    </>
  ),
} as const;

const COMPANY: Item[] = [
  { href: "/", label: "Home", icon: "home", spy: ["top", "surfaces"] },
  { href: "/work", label: "Works", icon: "work", spy: ["work", "collaborations"] },
  { href: "/testimonials", label: "Testimonials", icon: "quote", spy: ["testimonials"] },
  { href: "/about", label: "About Us", icon: "info", spy: ["about"] },
];

const PRODUCTS: Item[] = [
  { href: "/calling", label: "Calling Agents", icon: "phone" },
  { href: "/avatar", label: "3d Avatar Agents", icon: "avatar" },
  { href: "/webnav", label: "Website Navigation", icon: "compass" },
];

const productNav = (self: LinkProps["to"]): Item[] => [
  { href: self, label: "Home", icon: "home" },
  ...COMPANY.filter((c) => c.href !== "/"),
];

type Section = {
  items: Item[];
  label: string;
  tag?: string;
  products: Item[] | null;
};

const productSection = (
  self: LinkProps["to"],
  label: string,
  tag: string,
): Section => ({
  items: productNav(self),
  label,
  tag,
  products: PRODUCTS.filter((p) => p.href !== self),
});

function sectionFor(pathname: string): Section {
  if (pathname.startsWith("/calling"))
    return productSection("/calling", "Calling", "VoxioAgents Calling");
  if (pathname.startsWith("/avatar"))
    return productSection("/avatar", "Avatar", "VoxioAgents Avatar");
  if (pathname.startsWith("/webnav"))
    return productSection("/webnav", "Navigator", "VoxioAgents Navigator");
  return { items: COMPANY, label: "Company", products: PRODUCTS };
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="nav-ico" data-icon={name}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONS[name]}
      </svg>
    </span>
  );
}

function NavLink({
  item,
  current,
  onNavigate,
}: {
  item: Item;
  current: boolean;
  onNavigate: () => void;
}) {
  const inner = (
    <>
      <Icon name={item.icon} />
      <span className="nav-label">{item.label}</span>
    </>
  );
  const shared = {
    className: current ? "is-current" : "",
    "aria-current": current ? ("page" as const) : undefined,
    "aria-label": item.label,
    onClick: onNavigate,
  };
  const noAutoActive = {
    activeProps: {},
    inactiveProps: {},
    activeOptions: { exact: true, includeHash: false, includeSearch: false },
  };

  return item.hash ? (
    <a href={`#${item.hash}`} {...shared}>
      {inner}
    </a>
  ) : (
    <Link to={item.href} {...noAutoActive} {...shared}>
      {inner}
    </Link>
  );
}

export default function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [flyOpen, setFlyOpen] = useState(false);
  // The products pane also opens on its own at the foot of the page — see the
  // scroll effect below. Kept apart from flyOpen so a scroll can close the
  // hover pane without also cancelling the offer.
  const [autoFly, setAutoFly] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const section = sectionFor(pathname);
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const isCurrent = (item: Item) => {
    if (activeSection) {
      if (item.hash) return item.hash === activeSection;
      if (item.spy?.includes(activeSection)) return true;
      if (section.items.some((i) => i.hash || i.spy)) return false;
    }
    if (item.hash) return false;
    const href = String(item.href).replace(/\/$/, "");
    const here = pathname.replace(/\/$/, "") || "/";
    if (href === "/work" && here === "/collaborations") return true;
    return here === (href || "/");
  };

  const place = useCallback(() => {
    const pane = paneRef.current;
    const ind = indRef.current;
    if (!pane || !ind) return;
    const link = pane.querySelector<HTMLAnchorElement>("a.is-current");
    if (!link) {
      ind.style.display = "none";
      return;
    }
    const b = pane.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    ind.style.display = "";
    ind.style.width = `${r.width}px`;
    ind.style.height = `${r.height}px`;
    ind.style.transform = `translate(${r.left - b.left}px,${r.top - b.top}px)`;
  }, []);

  const until = useRef(0);
  const running = useRef(false);
  const follow = useCallback(() => {
    until.current = performance.now() + 560;
    if (running.current) return;
    running.current = true;
    const step = (t: number) => {
      place();
      if (t < until.current) requestAnimationFrame(step);
      else running.current = false;
    };
    requestAnimationFrame(step);
  }, [place]);

  useEffect(() => {
    follow();
    window.addEventListener("resize", place, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(follow);
    return () => window.removeEventListener("resize", place);
  }, [follow, place, pathname]);

  useEffect(() => {
    let ticking = false;
    let last = window.scrollY;

    const read = () => {
      const watched = document.querySelector(".hero, .callhero, .masthead");
      if (watched) setExpanded(watched.getBoundingClientRect().bottom > 120);
      else setExpanded(window.scrollY < 120);

      // "Want to see the products?" — once the page bottoms out past About the
      // pane offers itself, and any real scroll back up takes the offer away.
      // The 4px slack is because momentum scrolling jitters a pixel either way
      // at rest, which would otherwise close it the moment it opened.
      const y = window.scrollY;
      const up = y < last - 4;
      const down = y > last + 4;
      if (up || down) last = y;

      if (!window.matchMedia("(min-width: 1151px)").matches) {
        setAutoFly(false);
        return;
      }
      const room = document.documentElement.scrollHeight - y - window.innerHeight;
      if (room <= 160) setAutoFly(true);
      else if (up || room > 420) setAutoFly(false);
    };

    const onScroll = () => {
      setFlyOpen(false);
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        read();
      });
    };

    last = window.scrollY;
    read();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    follow();
  }, [expanded, autoFly, follow]);

  const spied = section.items.flatMap((i) => (i.hash ? [i.hash] : (i.spy ?? [])));
  const spyKey = spied.join(",");

  useEffect(() => {
    if (!spyKey) {
      setActiveSection(null);
      return;
    }
    const ids = spyKey.split(",");
    const read = () => {
      const line = window.innerHeight * 0.34;
      let best: { top: number; id: string } | null = null;
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        if (top <= line && (!best || top > best.top)) best = { top, id };
      });
      setActiveSection(best ? (best as { id: string }).id : null);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        read();
      });
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [spyKey, pathname]);

  useEffect(() => {
    follow();
  }, [activeSection, follow]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setFlyOpen(false);
    };
    const wide = window.matchMedia("(min-width: 1151px)");
    const onWide = (e: MediaQueryListEvent) => e.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, []);

  // Hover wins over the automatic offer, and either one shows the pane.
  const flyShown = flyOpen || autoFly;

  const openFly = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (window.matchMedia("(min-width: 1151px)").matches) setFlyOpen(true);
    follow();
  };
  const closeFly = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setFlyOpen(false);
      follow();
    }, 140);
  };

  const leave = () => setMenuOpen(false);

  return (
    <>
      <div
        className="menu-backdrop"
        id="menu-backdrop"
        onClick={() => setMenuOpen(false)}
      />

      <header className="header">
        <div className="bar-group">
          <div className="glass-bar glass-bar--brand">
            {section.tag ? (
              <>
                <span className="product-tag">{section.tag}</span>
                <span className="bar-rule" aria-hidden="true" />
              </>
            ) : null}
            <Link
              className="logo"
              to="/"
              aria-label="Voxio"
              title={
                section.tag ? "Voxio.ai — back to the main site" : "Voxio"
              }
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45" />
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                  <circle cx="16.7" cy="20.8" r="1.45" />
                </g>
              </svg>
              <span>
                Voxio<span className="logo-suffix">.ai</span>
              </span>
            </Link>

            <button
              className="burger"
              id="burger"
              type="button"
              aria-controls="site-nav"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>

          <div
            className={`nav-shell${expanded ? " is-expanded" : ""}`}
            id="site-nav"
            onPointerOver={follow}
            onPointerOut={follow}
          >
            <div className="glass-bar glass-bar--nav" ref={paneRef}>
              <nav className="nav" aria-label={section.label}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.hash ?? String(item.href)}
                    item={item}
                    current={isCurrent(item)}
                    onNavigate={leave}
                  />
                ))}
                {section.products ? (
                <button
                  type="button"
                  className="nav-trigger"
                  aria-haspopup="true"
                  aria-expanded={flyShown}
                  aria-controls="nav-products"
                  aria-label="Products"
                  onMouseEnter={openFly}
                  onMouseLeave={closeFly}
                  onFocus={openFly}
                  onBlur={closeFly}
                  onClick={() => {
                    setAutoFly(false);
                    setFlyOpen((v) => !v);
                  }}
                >
                  <Icon name="grid" />
                  <span className="nav-label">Products</span>
                </button>
                ) : null}
              </nav>
              {/* behind the links: the pill, z-index 1 against their 2 */}
              <span className="nav-ind" aria-hidden="true" ref={indRef} />
            </div>

            {section.products ? (
              <div
                className={`glass-bar glass-bar--nav glass-bar--flyout${
                  flyShown ? " is-open" : ""
                }`}
                id="nav-products"
                onMouseEnter={openFly}
                onMouseLeave={closeFly}
              >
                <nav className="nav nav-flyout" aria-label="Products">
                  {section.products.map((item) => (
                    <NavLink
                      key={String(item.href)}
                      item={item}
                      current={isCurrent(item)}
                      onNavigate={leave}
                    />
                  ))}
                </nav>
              </div>
            ) : null}

            <div className="glass-bar glass-bar--cta">
              <Link className="btn btn-solid header-cta" to="/contact" onClick={leave}>
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
