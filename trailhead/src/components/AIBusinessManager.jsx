import Reveal from './Reveal';
import { ArrowRight } from 'lucide-react';

const items = [
  { title: 'Cart recovery', impact: '\u20b932,000' },
  { title: 'Product bundle', impact: '\u20b921,000' },
  { title: 'Customer win-back', impact: '\u20b918,000' },
  { title: 'Product recommendation optimization', impact: '\u20b914,000' },
];

export default function AIBusinessManager() {
  return (
    <section className="section section--dark abm">
      <div className="container abm__layout">
        <Reveal className="abm__copy">
          <p className="eyebrow" style={{ color: '#B9B2FF' }}>AI Business Manager</p>
          <h2>Meet your AI Business Manager.</h2>
          <p className="abm__desc">
            Give TRAILHEAD a goal. It analyzes your business, finds opportunities,
            coordinates AI Employees, recommends actions, executes approved tasks,
            measures results, and continuously improves.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="abm__console card">
          <div className="abm__message abm__message--user">
            Increase revenue by 15% this month.
          </div>
          <div className="abm__message abm__message--ai">
            I found 4 high-impact opportunities.
          </div>

          <ul className="abm__list">
            {items.map((it, i) => (
              <li key={it.title}>
                <span className="abm__list-index">{i + 1}</span>
                <span className="abm__list-title">{it.title}</span>
                <span className="abm__list-impact">{it.impact}</span>
              </li>
            ))}
          </ul>

          <div className="abm__total">
            <span>Estimated combined opportunity</span>
            <strong>\u20b985,000</strong>
          </div>

          <button className="btn btn--onDark abm__review">
            Review Strategy <ArrowRight size={16} />
          </button>
        </Reveal>
      </div>
    </section>
  );
}
