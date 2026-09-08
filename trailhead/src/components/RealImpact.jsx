import { ArrowUp, ArrowDown } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { impactMetrics } from '../data/content';

export default function RealImpact() {
  return (
    <section className="section section--alt">
      <div className="container">
        <SectionHeader
          eyebrow="Real business impact"
          title="AI should create business results. Not just impressive conversations."
        />

        <div className="impact-grid">
          {impactMetrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 0.05} className={`impact-card impact-card--${m.dir}`}>
              {m.dir === 'up' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              <span>{m.label}</span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="impact-note">
          <p>Actual results vary by business, catalog and configuration.</p>
        </Reveal>
      </div>
    </section>
  );
}
