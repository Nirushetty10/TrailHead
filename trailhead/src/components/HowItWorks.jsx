import SectionHeader from './SectionHeader';
import Reveal from './Reveal';
import { howItWorks } from '../data/content';

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <SectionHeader
          eyebrow="How it works"
          title="Live in days, not months."
          body="Five steps take you from connecting your store to a business that continuously improves itself."
        />

        <div className="timeline">
          {howItWorks.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.1} className="timeline__item">
              <span className="timeline__number">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
