import { TrendingUp } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { opportunities } from '../data/content';

export default function OpportunityEngine() {
  return (
    <section className="section">
      <div className="container">
        <SectionHeader
          eyebrow="Opportunity Engine"
          title="TRAILHEAD finds opportunities you might miss."
          body="Every day, TRAILHEAD scans your store for patterns worth acting on — and tells you what to do about them."
        />

        <div className="opp-grid">
          {opportunities.map((o, i) => (
            <Reveal key={o.kind} delay={i * 0.08} className="opp-card card">
              <span className="pill">
                <TrendingUp size={13} /> {o.kind}
              </span>
              <h3>{o.title}</h3>
              {o.evidence.length > 0 && (
                <ul className="opp-card__evidence">
                  {o.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
              <p className="opp-card__action">{o.action}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
