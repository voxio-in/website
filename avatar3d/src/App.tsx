import { useState } from 'react';
import Bottom from './components/Bottom';
import MobileMenu from './components/MobileMenu';
import Nav from './components/Nav';
import Stats from './components/Stats';
import { VIDEO_URL } from './components/links';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <video
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />

      <Nav onOpenMenu={() => setMenuOpen(true)} />
      <Stats />
      <Bottom />

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
