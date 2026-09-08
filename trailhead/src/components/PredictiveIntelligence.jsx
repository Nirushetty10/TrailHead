import { Activity } from 'lucide-react';
import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { predictions } from '../data/content';

export default function PredictiveIntelligence() {
  return (
    <section className="section">
      <div className="container">
        <SectionHeader
          eyebrow="Predictive Intelligence"
          title="Don\u2019t just understand what happened. Know what could happen next."
          body="TRAILHEAD looks for early signals in behavior and orders, and estimates what they\u2019re likely to mean."
        />

        <div className="pred-grid">
          {predictions.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="pred-card card">
              <Activity size={18} strokeWidth={1.75} />
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className={`pred-card__confidence pred-card__confidence--${p.confidence.toLowerCase()}`}>
                Confidence: {p.confidence}
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="pred-note">
          <p>Predictions are estimates based on available data — not guarantees.</p>
        </Reveal>
      </div>
    </section>
  );
}
