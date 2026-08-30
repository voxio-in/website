// The footer every page ends with, lifted out of the page markup so the nine
// links live in one place.

import { Link } from '@tanstack/react-router'

export default function SiteFooter() {
  return (
      <footer className="site-foot">
        <span>&copy; 2026 Voxio Agents. All rights reserved.</span>
        <nav aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/work">Work</Link>
          <Link to="/testimonials">Testimonials</Link>
          <Link to="/collaborations">Collaborations</Link>
          <Link to="/about">About Us</Link>
          <Link to="/calling">Calling Agents</Link>
          <Link to="/avatar">3d Avatar Agents</Link>
          <Link to="/webnav">Website Navigation</Link>
          <Link to="/contact">Contact us</Link>
        </nav>
      </footer>
  )
}
