import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { differentiators } from '../data/content';

export default function WhyTrailhead() {
  return (
    <section className="section">
      <div className="container">
        <SectionHeader eyebrow="Why TRAILHEAD" title="Built to be more than a chatbot, from the ground up." />

        <div className="why-grid">
          {differentiators.map((d, i) => (
            <Reveal key={d.title} delay={i * 0.06} className="why-card">
              <span className="why-card__index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
