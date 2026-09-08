import { AtSign, Rss } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: ['Platform', 'AI Employees', 'Intelligence', 'Automation', 'Integrations', 'Pricing'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'Blog', 'Guides', 'Help Center'],
  },
  {
    title: 'Company',
    links: ['About', 'Contact', 'Careers'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security'],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <span className="navbar__logo">
            <span className="navbar__mark" aria-hidden="true" />
            TRAILHEAD
          </span>
          <p>AI Employees for E-commerce.</p>
          <div className="footer__social">
            <a href="#" aria-label="TRAILHEAD on social"><AtSign size={17} /></a>
            <a href="#" aria-label="TRAILHEAD blog feed"><Rss size={17} /></a>
          </div>
        </div>

        <div className="footer__columns">
          {columns.map((col) => (
            <div key={col.title} className="footer__col">
              <span>{col.title}</span>
              <ul>
                {col.links.map((l) => (
                  <li key={l}><a href="#">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container footer__bottom">
        <p>Build a smarter store with TRAILHEAD.</p>
        <p className="footer__copyright">\u00a9 {new Date().getFullYear()} TRAILHEAD. All rights reserved.</p>
      </div>
    </footer>
  );
}
