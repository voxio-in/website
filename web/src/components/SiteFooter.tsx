// The footer every page ends with, lifted out of the page markup so the links
// live in one place. Privacy and Terms sit at the end: a reader looking for them
// looks last, and they should not push the product links down.

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
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </footer>
  )
}
