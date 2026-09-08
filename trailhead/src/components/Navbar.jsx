import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const LINKS = [
  { label: 'Platform', href: '#platform' },
  { label: 'AI Employees', href: '#ai-employees' },
  { label: 'Intelligence', href: '#intelligence' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Pricing', href: '#pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        <a href="#top" className="navbar__logo">
          <span className="navbar__mark" aria-hidden="true" />
          TRAILHEAD
        </a>

        <nav className="navbar__links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="navbar__actions">
          <a href="#signin" className="navbar__signin">Sign In</a>
          <a href="#demo" className="btn btn--ghost navbar__demo">Book a Demo</a>
          <a href="#get-started" className="btn btn--primary">Get Started</a>
        </div>

        <button
          className="navbar__toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div className={`navbar__mobile ${open ? 'navbar__mobile--open' : ''}`}>
        <nav aria-label="Mobile">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <a href="#signin" onClick={() => setOpen(false)}>Sign In</a>
        </nav>
        <div className="navbar__mobile-actions">
          <a href="#demo" className="btn btn--ghost" onClick={() => setOpen(false)}>Book a Demo</a>
          <a href="#get-started" className="btn btn--primary" onClick={() => setOpen(false)}>Get Started</a>
        </div>
      </div>
    </header>
  );
}
