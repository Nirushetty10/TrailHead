import Reveal from './Reveal';

const evolution = [
  'AI Assistant',
  'AI Sales & Support',
  'AI Employees',
  'Business Intelligence',
  'Predictive Commerce',
  'Autonomous Growth',
  'Autonomous Commerce OS',
];

export default function FutureVision() {
  return (
    <section className="section section--dark">
      <div className="container">
        <Reveal className="progression-head">
          <p className="eyebrow" style={{ color: '#B9B2FF' }}>Where this is going</p>
          <h2 className="progression-statement">The future of e-commerce is autonomous.</h2>
        </Reveal>

        <div className="progression progression--vertical">
          {evolution.map((s, i) => (
            <Reveal key={s} delay={i * 0.06} className="progression__stage">
              <span className="progression__dot" />
              <span>{s}</span>
              {i < evolution.length - 1 && <span className="progression__connector progression__connector--vertical" aria-hidden="true" />}
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.4} className="future-statement">
          <p>TRAILHEAD is being built to become the intelligence layer that helps businesses understand, decide and act.</p>
        </Reveal>
      </div>
    </section>
  );
}
